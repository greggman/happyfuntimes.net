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

var should = require('should');
var GameCache = require('../lib/gamecache');

describe('GameCache', function() {
  it('test we can add and retrieve an address', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp = "4.5.6.7";
    var internalPort = "2345";
    var expectedResult = internalIp + ":" + internalPort;

    cache.addExternalIpToInternalIpGame(externalIp, internalIp, internalPort);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(1);
    ips[0].should.equal(expectedResult);

    cache.getInfo().numGames.should.equal(1);

    cache.destroy();
  });

  it('test we can add and retrieve 2 addresses', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp1 = "4.5.6.7";
    var internalPort1 = "2345";
    var internalIp2 = "5.6.7.8";
    var internalPort2 = "3456";
    var expectedResult1 = internalIp1 + ":" + internalPort1;
    var expectedResult2 = internalIp2 + ":" + internalPort2;

    cache.addExternalIpToInternalIpGame(externalIp, internalIp1, internalPort1);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp2, internalPort2);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(2);
    ips.should.containEql(expectedResult1);
    ips.should.containEql(expectedResult2);

    cache.getInfo().numGames.should.equal(2);

    cache.destroy();
  });

  it('test we can add the same address twice only returns 1', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp = "4.5.6.7";
    var internalPort = "2345";
    var expectedResult = internalIp + ":" + internalPort;

    cache.addExternalIpToInternalIpGame(externalIp, internalIp, internalPort);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp, internalPort);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(1);
    ips.should.containEql(expectedResult);

    cache.getInfo().numGames.should.equal(1);

    cache.destroy();
  });

  it('test we can add the same address twice with different ports, returns newest port', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp = "4.5.6.7";
    var internalPort1 = "2345";
    var internalPort2 = "3456";
    var expectedResult = internalIp + ":" + internalPort2;

    cache.addExternalIpToInternalIpGame(externalIp, internalIp, internalPort1);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp, internalPort2);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(1);
    ips.should.containEql(expectedResult);

    cache.getInfo().numGames.should.equal(1);

    cache.destroy();
  });

  it('test we get no addresses for unknown ip', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.should.be.empty;
    cache.getInfo().numGames.should.equal(0);

    cache.destroy();
  });

  describe("expiration", function() {
    var currentTime = 0;
    var intervalFn;

    var getTimeFn = function() {
      return currentTime;
    };

    var setInterval = function(fn, interval) {
      intervalFn = fn;
    };

    var clearInterval = function() {
    };

    it('test addresses expire', function() {
      var cache = new GameCache({
        gcTime: 1,
        maxTime: 6,
        getTimeFn: getTimeFn,
        setIntervalFn: setInterval,
        clearIntervalFn: clearInterval,
      });

      var externalIp = "1.2.3.4";
      var internalIp1 = "4.5.6.7";
      var internalPort1 = "2345";
      var internalIp2 = "5.6.7.8";
      var internalPort2 = "3456";
      var expectedResult1 = internalIp1 + ":" + internalPort1;
      var expectedResult2 = internalIp2 + ":" + internalPort2;

      currentTime = 1;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1, internalPort1);
      currentTime = 10;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp2, internalPort2);

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(expectedResult1);
      ips.should.containEql(expectedResult2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 8;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(1);
      ips.should.not.containEql(expectedResult1);
      ips.should.containEql(expectedResult2);
      cache.getInfo().numGames.should.equal(1);

      currentTime = 18;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.should.be.empty;
      cache.getInfo().numGames.should.equal(0);
    });

    it('test addresses reset expiration time if added again', function() {
      var cache = new GameCache({
        gcTime: 1,
        maxTime: 6,
        getTimeFn: getTimeFn,
        setIntervalFn: setInterval,
        clearIntervalFn: clearInterval,
      });

      var externalIp = "1.2.3.4";
      var internalIp1 = "4.5.6.7";
      var internalPort1 = "2345";
      var internalIp2 = "5.6.7.8";
      var internalPort2 = "3456";
      var expectedResult1 = internalIp1 + ":" + internalPort1;
      var expectedResult2 = internalIp2 + ":" + internalPort2;

      currentTime = 1;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1, internalPort1);
      currentTime = 10;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp2, internalPort2);
      currentTime = 20;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1, internalPort1);
      cache.getInfo().numGames.should.equal(2);

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(expectedResult1);
      ips.should.containEql(expectedResult2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 8;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(expectedResult1);
      ips.should.containEql(expectedResult2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 18;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(1);
      ips.should.not.containEql(expectedResult2);
      ips.should.containEql(expectedResult1);
      cache.getInfo().numGames.should.equal(1);

      currentTime = 28;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.should.be.empty;
      cache.getInfo().numGames.should.equal(0);

    });
  });


});
