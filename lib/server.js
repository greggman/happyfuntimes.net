/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

var bodyParser = require('body-parser');
var express = require('express');
var gameCache = new (require('./gamecache'));
var http = require('http');
var path = require('path');
var log = require('./log');

var app = express();

var getIpAddress = function(req) {
  var ip = req.headers['x-forwarded-for'] ||
       req.connection.remoteAddress ||
       req.socket.remoteAddress ||
       req.connection.socket.remoteAddress;
  if (ip && ip.indexOf(',')) {
    ip = ip.split(",")[0];
  }
  return ip;
};

var validIpAddress = (function() {
  var ipAddressRE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

  return function(address) {
    return ipAddressRE.test(address);
  };
}());

var validPort = (function() {
  var portRE = /^\d{1,5}$/;

  return function(port) {
    return portRE.test(port);
  };
}());

var handleInform = function(req, res) {
  var ip = getIpAddress(req);
  if (!ip) {
    log.info("inform: no public ip address", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing public ip address"});
    return;
  }
  //req
  var hftIp = req.query.hftip;
  if (!hftIp) {
    log.info("inform: no hft ip address", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "missing hft ip address"});
    return;
  }

  if (!validIpAddress(hftIp)) {
    log.info("inform: bad hft ip address", { ip: hftIp });
    res.status(400).json({msg: "invalid hft ip address"});
    return;
  }

  var hftPort = req.query.hftport;
  if (!hftPort) {
    log.info("inform: no hft port", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "missing hft port"});
    return;
  }

  if (!validPort(hftPort)) {
    log.info("inform: bad port", { port: hftPort });
    res.status(400).json({msg: "invalid hft ip address"});
    return;
  }

  log.info("added game: ", {ip: ip, hftIp: hftIp, hftPort: hftPort});
  gameCache.addExternalIpToInternalIpGame(ip, hftIp + ":" + hftPort);
  res.status(200).json({ip: ip});
};

var handleInform2 = function(req, res) {

  var ip = getIpAddress(req);
  if (!ip) {
    log.info("inform: no public ip address", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing public ip address"});
    return;
  }

  var addresses = req.body.addresses;
  if (!addresses) {
    log.info("inform: no addresss", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "missing addresses"});
    return;
  }

  if (!addresses.length) {
    log.info("inform: zero addresss", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "zero addresses"});
    return;
  }

  for (var ii = 0; ii < addresses.length; ++ii) {
    var address = addresses[ii];
    if (!validIpAddress(address)) {
      log.info("inform: bad ip address", { ip: address });
      res.status(400).json({msg: "invalid ip address"});
      return;
    }
  }

  var port = req.body.port;
  if (!port) {
    log.info("inform: no port", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "missing port"});
    return;
  }

  if (!validPort(port)) {
    log.info("inform: bad port", { port: port });
    res.status(400).json({msg: "invalid port"});
    return;
  }

  addresses.forEach(function(address) {
    gameCache.addExternalIpToInternalIpGame(ip, address + ":" + port);
  });
  log.info("added game: ", {ip: ip, addresses: addresses, port: port});
  res.status(200).json({ip: ip});
};

var handleGetGames = function(req, res) {
  var ip = getIpAddress(req);
  if (!ip) {
    log.info("getGames: no public ip address", { "usage-agent": req.headers['user-agent']});
    res.status(400).json({msg: "missing public ip address"});
    return;
  }
  var gameIps = gameCache.getInternalIpsForExternalIp(ip);
  log.info("got games for: ", {ip: ip});
  res.status(200).json(gameIps);
};

var handleCheck = function(req, res) {
  res.header('Content-Type', 'application/xml');
  return res.status(200).send([
    "<pingdom_http_custom_check>",
    "<status>OK</status>",
    "<response_time>0.1</response_time>",
    "<server_time>" + Date.now() + "</server_time>",
    "</pingdom_http_custom_check>",
  ].join("\n"));
};

var handleStatus = function(req, res) {
  res.status(200).json({
    gameCache: gameCache.getInfo(),
  });
};

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-HTTP-Method-Override');
  // res.header('Access-Control-Allow-Credentials', false);
  // res.header('Access-Control-Max-Age', 86400);

  if (req.method === "OPTIONS") {
    res.status(200).end("{}");
  } else {
    next();
  }
};

var handleOPTIONS = function(req, res) {
  res.status(200).end("{}");
};

app.use(allowCrossDomain);
app.use(bodyParser.json());
app.use('/', express.static(path.normalize(path.join(__dirname, "..", "public"))));
app.post('/api/inform', handleInform);
app.post('/api/inform2', handleInform2);
app.post('/api/getgames', handleGetGames);
app.post('/api/status', handleStatus);
app.post('/check', handleCheck);
app.get('/check', handleCheck);
app.options(/.*/, handleOPTIONS);

var server = http.createServer(app);

// For testing
server.clearGameCache = function() {
  gameCache.clear();
};

server.monitor = function() {
  var interval = 1000 * 60 * 30;
  setInterval(function() {
    log.info('gameCache state', gameCache.getInfo());
  }, interval);
};


module.exports = server;

