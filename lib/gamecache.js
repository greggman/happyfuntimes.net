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

// We need to track happyFunTimes instances so we can connect users to their local game.
//
// 1.  hft-game contacts hft/api/inform?hftip=1.2.3.4
// 2.  we look up public ip address (assume 6.7.8.9) and record that
//
// 3.  Players go to hft/
// 4.  We look up public up address which should be the same as hft-game in this case
//     6.7.8.9 so we tell player to go to 1.2.3.4.
//
// Complications:
//
// *  Two hft-games come from same external ip address. What should we do?
//
//    1.  Send game list of internal ip address. Let player pick. Player's
//        controller will list hft games running
//    2.  Expire old ip addresses. Let's assume 2hrs? 1hr?


var GameCache = function(options) {
  options = options || {};

  //var p_gcTime  = options.gcTime  || 1000 * 60;           // once a minute
  var p_maxTime = options.maxTime || 1000 * 60 * 60 * 2;  // 2 hours
  var p_getTimeFn = options.getTimeFn || function() {
    return Date.now();
  };
  var p_setIntervalFn = options.setIntervalFn || setInterval;
  var p_clearIntervalFn = options.clearIntervalFn || clearInterval;

  var p_gamesByExternalIpAddress = {};
  var p_gamesToCheckLater = []; // ids as {x:externalIp,i:internalIp}

  var getIpIndexInGame = function(game, ip) {
    for (var ii = 0; ii < game.ips.length; ++ii) {
      if (game.ips[ii].ip === ip) {
        return ii;
      }
    }
    return -1;
  };

  var addExternalIpToInternalIpGame = function(externalIpAddress, internalIp) {
    var game = p_gamesByExternalIpAddress[externalIpAddress];
    if (!game) {
      game = { ips: [] };
      p_gamesByExternalIpAddress[externalIpAddress] = game;
    }
    var index = getIpIndexInGame(game, internalIp);
    if (index < 0) {
      index = game.ips.length;
      game.ips.push({ip: internalIp});
    }

    var internal = game.ips[index];
    internal.time = p_getTimeFn();

    var id = JSON.stringify({x:externalIpAddress, i: internalIp});
    index = p_gamesToCheckLater.indexOf(id);
    if (index >= 0) {
      p_gamesToCheckLater.splice(index, 1);
    }

    p_gamesToCheckLater.push(id);
  };

  var getInternalIpsForExternalIp = function(externalIpAddress) {
    var game = p_gamesByExternalIpAddress[externalIpAddress];
    if (!game) {
      return [];
    }
    return game.ips.map(function(internal) {
      return internal.ip;
    });
  };

  var removeOld = function() {
    var now = p_getTimeFn();
    while (p_gamesToCheckLater.length) {
      var ips = JSON.parse(p_gamesToCheckLater[0]);
      var game = p_gamesByExternalIpAddress[ips.x];
      var index = getIpIndexInGame(game, ips.i);
      var internal = game.ips[index];
      var elapsed = now - internal.time;
      if (elapsed < p_maxTime) {
        break;
      }

      game.ips.splice(index, 1);
      p_gamesToCheckLater.shift();
      if (!game.ips.length) {
        delete p_gamesByExternalIpAddress[ips.x];
      }
    }
  };

  var p_intervalId = p_setIntervalFn(removeOld, 1000 * 60);

  var clear = function() {
    p_gamesByExternalIpAddress = {};
    p_gamesToCheckLater = [];
  };

  var destroy = function() {
    p_clearIntervalFn(p_intervalId);
    clear();
  };

  var getInfo = function() {
    return {
      numGames: p_gamesToCheckLater.length,
    };
  };

  var checkIntegrity = function() {
    var now = p_getTimeFn();
    var lastDelta = 0;
    for (var ii = p_gamesToCheckLater.length - 1; ii >= 0; --ii) {
      var ips = JSON.parse(p_gamesToCheckLater[ii]);
      var delta = now - ips.time;
      if (delta < lastDelta) {
        return false;
      }
      lastDelta = delta;
    }
    return true;
  };

  this.addExternalIpToInternalIpGame = addExternalIpToInternalIpGame;
  this.getInternalIpsForExternalIp = getInternalIpsForExternalIp;
  this.destroy = destroy;
  this.clear = clear;
  this.getInfo = getInfo;
  this.checkIntegrity = checkIntegrity;
};


module.exports = GameCache;
