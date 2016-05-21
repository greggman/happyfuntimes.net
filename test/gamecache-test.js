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
    var internalIp = "4.5.6.7:2345";

    cache.addExternalIpToInternalIpGame(externalIp, internalIp);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(1);
    ips[0].should.equal(internalIp);

    cache.getInfo().numGames.should.equal(1);

    cache.destroy();
  });

  it('test we can add and retrieve 2 addresses', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp1 = "4.5.6.7:2345";
    var internalIp2 = "5.6.7.8:3456";

    cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp2);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(2);
    ips.should.containEql(internalIp1);
    ips.should.containEql(internalIp2);

    cache.getInfo().numGames.should.equal(2);

    cache.destroy();
  });

  it('test we can add the same address twice only returns 1', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp = "4.5.6.7:2345";

    cache.addExternalIpToInternalIpGame(externalIp, internalIp);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(1);
    ips.should.containEql(internalIp);

    cache.getInfo().numGames.should.equal(1);

    cache.destroy();
  });

  it('test we can add the same address twice with different ports, returns both', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4";
    var internalIp1 = "4.5.6.7:2345";
    var internalIp2 = "4.5.6.7:3456";

    cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp2);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(2);
    ips.should.containEql(internalIp1);
    ips.should.containEql(internalIp2);

    cache.getInfo().numGames.should.equal(2);

    cache.destroy();
  });

  it('test we get no addresses for unknown ip', function() {
    var cache = new GameCache();

    var externalIp = "1.2.3.4:2345";

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.should.be.empty;
    cache.getInfo().numGames.should.equal(0);

    cache.destroy();
  });

  it('test we can add and retrieve ipv6 address', function() {
    var cache = new GameCache();

    var externalIp = "2001:db8::1234";
    var internalIp1 = "[2001:db8:5678]:2345";
    var internalIp2 = "[2001:db8:5678]:3456";

    cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
    cache.addExternalIpToInternalIpGame(externalIp, internalIp2);

    var ips = cache.getInternalIpsForExternalIp(externalIp);
    ips.length.should.equal(2);
    ips.should.containEql(internalIp1);
    ips.should.containEql(internalIp2);

    // It's 34 because we are doing subnets
    cache.getInfo().numGames.should.equal(34);

    cache.destroy();
  });

  it('test we can add and retrieve different games for different ipv6 address', function() {
    var cache = new GameCache();

    var externalIp1 = "2001:db8:1::1234";
    var externalIp2 = "2001:db8:2::1234";
    var internalIp1 = "[2001:db8:5678]:2345";
    var internalIp2 = "[2001:db8:5678]:3456";

    cache.addExternalIpToInternalIpGame(externalIp1, internalIp1);
    cache.addExternalIpToInternalIpGame(externalIp2, internalIp2);

    var ips = cache.getInternalIpsForExternalIp(externalIp1);
    ips.length.should.equal(1);
    ips.should.containEql(internalIp1);

    var ips = cache.getInternalIpsForExternalIp(externalIp2);
    ips.length.should.equal(1);
    ips.should.containEql(internalIp2);

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
      var internalIp1 = "4.5.6.7:2345";
      var internalIp2 = "5.6.7.8:3456";

      currentTime = 1;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
      currentTime = 10;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp2);

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(internalIp1);
      ips.should.containEql(internalIp2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 8;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(1);
      ips.should.not.containEql(internalIp1);
      ips.should.containEql(internalIp2);
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
      var internalIp1 = "4.5.6.7:2345";
      var internalIp2 = "5.6.7.8:3456";

      currentTime = 1;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
      currentTime = 10;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp2);
      currentTime = 20;
      cache.addExternalIpToInternalIpGame(externalIp, internalIp1);
      cache.getInfo().numGames.should.equal(2);

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(internalIp1);
      ips.should.containEql(internalIp2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 8;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(2);
      ips.should.containEql(internalIp1);
      ips.should.containEql(internalIp2);
      cache.getInfo().numGames.should.equal(2);

      currentTime = 18;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.length.should.equal(1);
      ips.should.not.containEql(internalIp2);
      ips.should.containEql(internalIp1);
      cache.getInfo().numGames.should.equal(1);

      currentTime = 28;
      intervalFn();

      var ips = cache.getInternalIpsForExternalIp(externalIp);
      ips.should.be.empty;
      cache.getInfo().numGames.should.equal(0);

    });
  });


});
