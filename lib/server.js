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

var debug = require('debug')('server');
var bodyParser = require('body-parser');
var express = require('express');
var gameCache = new (require('./gamecache'));
var ip6addr = require('ip6addr');
var http = require('http');
var path = require('path');
var log = require('./log');

var Server = function Server(options) {
  options = options || {};
  var app = express();

  function isValidIpAddress(address) {
    try {
      var p = ip6addr.parse(address);
      return p !== undefined;
    } catch (e) {
      return false;
    }
  }

  function isIpv6(address) {
    return address.indexOf(':') >= 0;
  }

  function wrapIfIpv6(address) {
    return isIpv6(address) ? ('[' + address + ']') : address;
  }

  var getIpAddresses = function(req) {
    debug("x-forwarded-for", req.headers['x-forwarded-for']);
    var ips = req.headers['x-forwarded-for'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.connection.socket.remoteAddress;
    if (ips) {
      if (ips.indexOf(',')) {
        ips = ips.split(",");
      } else {
        ips = [ips];
      }
      ips = ips.map((s) => {
        return s.trim();
      });
      ips = ips.filter(isValidIpAddress);
    }
    return ips && ips.length ? ips : undefined;
  };

  var validPort = (function() {
    var portRE = /^\d{1,5}$/;

    return function(port) {
      return portRE.test(port);
    };
  }());

  var handleInform = function(req, res) {
    var ips = getIpAddresses(req);
    if (!ips) {
      log.info("inform: no public ip address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing public ip address"});
      return;
    }

    var hftIp = req.query.hftip;
    if (!hftIp) {
      log.info("inform: no hft ip address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing hft ip address"});
      return;
    }

    if (!isValidIpAddress(hftIp)) {
      log.info("inform: bad hft ip address", { ip: hftIp });
      res.status(400).json({msg: "invalid hft ip address"});
      return;
    }

    var hftPort = req.query.hftport;
    if (!hftPort) {
      log.info("inform: no hft port", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing hft port"});
      return;
    }

    if (!validPort(hftPort)) {
      log.info("inform: bad port", { port: hftPort });
      res.status(400).json({msg: "invalid hft ip address"});
      return;
    }

    log.info("added game: ", {ips: ips, hftIp: hftIp, hftPort: hftPort});
    ips.forEach(function(ip) {
      gameCache.addExternalIpToInternalIpGame(ip, hftIp + ":" + hftPort);
    });
    res.status(200).json({ip: ips[0], ips: ips});
  };

  var handleInform2 = function(req, res) {
    var ips = getIpAddresses(req);
    if (!ips) {
      log.info("inform: no public ip address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing public ip address"});
      return;
    }

    var addresses = req.body.addresses;
    if (!addresses) {
      log.info("inform: no address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing addresses"});
      return;
    }

    if (!addresses.length) {
      log.info("inform: zero addresss", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "zero addresses"});
      return;
    }

    function stripBrackets(s) {
      if (s.substr(0, 1) === '[' && s.substr(s.length - 1, 1) === ']') {
        return s.substr(1, s.length - 2);
      }
      return s;
    }

    addresses = addresses.map(stripBrackets);

    for (var ii = 0; ii < addresses.length; ++ii) {
      var address = addresses[ii];
      if (!isValidIpAddress(address)) {
        log.info("inform: bad ip address", { ip: address });
        res.status(400).json({msg: "invalid ip address"});
        return;
      }
    }

    var port = req.body.port;
    if (!port) {
      log.info("inform: no port", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing port"});
      return;
    }

    if (!validPort(port)) {
      log.info("inform: bad port", { port: port });
      res.status(400).json({msg: "invalid port"});
      return;
    }

    addresses.forEach(function(address) {
      ips.forEach(function(ip) {
        gameCache.addExternalIpToInternalIpGame(ip, wrapIfIpv6(address) + ":" + port);
      });
    });
    log.info("added game: ", {ips: ips, addresses: addresses, port: port});
    res.status(200).json({ip: ips[0], ips: ips});
  };

  var handleGetGames = function(req, res) {
    var ips = getIpAddresses(req);
    if (!ips) {
      log.info("getGames: no public ip address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing public ip address"});
      return;
    }
    var ip = ips[0];
    var gameIps = gameCache.getInternalIpsForExternalIp(ip);
    log.info("got games for: ", {ip: ip});
    res.status(200).json(gameIps);
  };

  var handleGetGames2 = function(req, res) {
    var ips = getIpAddresses(req);
    if (!ips) {
      log.info("getGames2: no public ip address", { "user-agent": req.headers['user-agent']});
      res.status(400).json({msg: "missing public ip address"});
      return;
    }
    var result = {
      gameIps: Array.prototype.concat.apply([], ips.map(gameCache.getInternalIpsForExternalIp.bind(gameCache))),
      publicIps: ips,
    };
    log.info("got games for: ", {ips: ips});
    res.status(200).json(result);
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
  var rootPath = options.rootPath || "public";
  app.use('/', express.static(path.normalize(path.join(__dirname, "..", rootPath))));
  app.post('/api/inform', handleInform);
  app.post('/api/inform2', handleInform2);
  app.post('/api/getgames', handleGetGames);
  app.post('/api/getgames2', handleGetGames2);
  app.post('/api/status', handleStatus);
  app.post('/check', handleCheck);
  app.get('/check', handleCheck);
  app.options(/.*/, handleOPTIONS);

  var server = http.createServer(app);

  this.listen = server.listen.bind(server);
  this.close = server.close.bind(server);

  // For testing
  this.clearGameCache = function() {
    gameCache.clear();
  };

  this.monitor = function() {
    var interval = 1000 * 60 * 30;
    setInterval(function() {
      log.info('gameCache state', gameCache.getInfo());
    }, interval);
  };
};

module.exports = Server;

