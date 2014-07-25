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

var express = require('express');
var gameCache = new (require('./gamecache'));
var http = require('http');
var path = require('path');
var winston = require('winston');

var app = express();

var g = {
  port: 1337,
  address: '127.0.0.1',
};

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
  }
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
    winston.log('info', "inform: no public ip address", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing public ip address"});
    return;
  }
  var hftIp = req.query.hftip;
  if (!hftIp) {
    winston.log('info', "inform: no hft ip address", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing hft ip address"});
    return;
  }

  if (!validIpAddress(hftIp)) {
    winston.log('info', "inform: bad hft ip address", { ip: hftIp });
    res.json(400, {msg: "invalid hft ip address"});
    return;
  }

  var hftPort = req.query.hftport;
  if (!hftPort) {
    winston.log('info', "inform: no hft port", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing hft port"});
    return;
  }

  if (!validPort(hftPort)) {
    winston.log('info', "inform: bad port", { port: hftPort });
    res.json(400, {msg: "invalid hft ip address"});
    return;
  }

  winston.log('info', "added game: ", {ip: ip, hftIp: hftIp, hftPort: hftPort});
  gameCache.addExternalIpToInternalIpGame(ip, hftIp, hftPort);
  res.json(200, {ip: ip});
};

var handleGetGames = function(req, res) {
  var ip = getIpAddress(req);
  if (!ip) {
    winston.log('info', "getGames: no public ip address", { "usage-agent": req.headers['user-agent']});
    res.json(400, {msg: "missing public ip address"});
    return;
  }
  var gameIps = gameCache.getInternalIpsForExternalIp(ip);
  winston.log('info', "got games for: ", {ip: ip});
  res.json(200, gameIps);
};

app.use('/', express.static(path.join(__dirname, "public")));
app.post('/api/inform', handleInform);
app.post('/api/getgames', handleGetGames);

var server = http.createServer(app);

// For testing
server.clearGameCache = function() {
  gameCache.clear();
};

module.exports = server;

