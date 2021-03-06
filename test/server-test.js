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

var Promise = require('promise');
var request = require('request').defaults({ json: true });
var Server = require('../lib/server');
var should = require('should');

var postP = function(url, body, headers) {
  body = body || {};
  return new Promise(function(fulfill, reject) {
    request.post(url, {json: true, body: body, headers: headers}, function(err, res, body) {
      if (err || res.statusCode != 200) {
        reject(new Error(err || res.body.msg || "failed request"));
      } else {
        fulfill(res, body);
      }
    });
  });
};

describe("server", function() {

  var server;

  before(function() {
    server = new Server();
    server.listen(8080);
  });

  after(function() {
    server.close();
  });

  afterEach(function() {
    server.clearGameCache();
  });

  describe("inform", function() {

    it("getGames should return no ips", function(done) {
      postP("http://localhost:8080/api/getgames").then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.empty;
      }).then(done, done);
    });

    it("getGames should return ip if 1 inform", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1.2.3.4&hftport=4567").then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(1);
        res.body.should.containEql("1.2.3.4:4567");
      }).then(done, done);
    });

    it("getGames should return 2 ips if 2 informs", function(done) {
      postP("http://localhost:8080/api/inform?hftip=5.6.7.8&hftport=2345").then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform?hftip=1.2.3.4&hftport=5432");
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("1.2.3.4:5432");
        res.body.should.containEql("5.6.7.8:2345");
      }).then(done, done);
    });

    it("getGames should return 2 ips if 2 informs with same ip different ports", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1.2.3.4&hftport=2345").then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform?hftip=1.2.3.4&hftport=5432");
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("1.2.3.4:5432");
        res.body.should.containEql("1.2.3.4:2345");
      }).then(done, done);
    });

    it("fails if missing ip address", function(done) {
      postP("http://localhost:8080/api/inform?hftport=2345").then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if bad ip address", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1234&hftport=2345").then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if missing port", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1.2.3.4").then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if missing port", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1.2.3.4").then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if bad port", function(done) {
      postP("http://localhost:8080/api/inform?hftip=1.2.3.4&hftport=123456").then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });
  });

  describe("inform2", function() {

    it("getGames should return ip if 1 inform", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "4567"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(1);
        res.body.should.containEql("10.2.3.4:4567");
      }).then(done, done);
    });

    it("getGames should return 2 ips if 2 informs", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.6.7.8"], port:"2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "5432"});
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("10.2.3.4:5432");
        res.body.should.containEql("10.6.7.8:2345");
      }).then(done, done);
    });

    it("getGames should return 2 ips if on inform with 2 addresses", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.6.7.8", "10.2.3.4"], port:"2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("10.2.3.4:2345");
        res.body.should.containEql("10.6.7.8:2345");
      }).then(done, done);
    });

    it("getGames should return 2 ips if 2 informs with same ip different ports", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "5432"});
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("10.2.3.4:5432");
        res.body.should.containEql("10.2.3.4:2345");
      }).then(done, done);
    });

    it("getGames should return match for internal ip if it looks public", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["5.6.7.8"], port:"2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        res.body.ip.length.should.be.above(6);
        var headers = { 'x-forwarded-for': '5.6.7.8' };
        return postP("http://localhost:8080/api/getgames", {}, headers);
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(1);
        res.body.should.containEql("5.6.7.8:2345");
      }).then(done, done);
    });

    it("fails if missing ip address", function(done) {
      postP("http://localhost:8080/api/inform2", {port: "2345"}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if bad ip address", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses: ["1234"], port: "2345"}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if no addresses", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses: [], port: "2345"}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if missing port", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"]}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if missing port", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"]}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

    it("fails if bad port", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "123456"}).then(function(res) {
        (false).should.be.true;  // error if we got here
      }, function(err) {
        (true).should.be.true;  // success if we got here
      }).then(done, done);
    });

  });

  describe("inform2-ipv6", function() {

    it("getGames should return ipv6 if 1 ipv6 inform", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["FD3::456"], port: "4567"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(1);
        res.body.should.containEql("[FD3::456]:4567");
      }).then(done, done);
    });

  });

  describe("inform2-ipv6-brackets", function() {

    it("getGames should return ipv6 if 1 ipv6 inform", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["[FD3::456]"], port: "4567"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(1);
        res.body.should.containEql("[FD3::456]:4567");
      }).then(done, done);
    });

  });

  it("getGames should return match for internal ip if it looks public ipv6", function(done) {
    postP("http://localhost:8080/api/inform2", {addresses:["2601:204:c702:5f87:3d3d:d184:f486:1e8a"], port:"2345"}).then(function(res) {
      res.body.ip.length.should.be.above(6);
      res.body.ip.length.should.be.above(6);
      var headers = { 'x-forwarded-for': '2601:204:c702:5f87:3d3d:d184:f486:1e8a' };
      return postP("http://localhost:8080/api/getgames", {}, headers);
    }).then(function(res) {
      res.body.should.be.instanceof(Array);
      res.body.should.be.length(1);
      res.body.should.containEql("[2601:204:c702:5f87:3d3d:d184:f486:1e8a]:2345");
    }).then(done, done);
  });

  it("getGames should not return match for internal ip if it does not look public ipv6", function(done) {
    postP("http://localhost:8080/api/inform2", {addresses:["F601:204:c702:5f87:3d3d:d184:f486:1e8a"], port:"2345"}).then(function(res) {
      res.body.ip.length.should.be.above(6);
      res.body.ip.length.should.be.above(6);
      var headers = { 'x-forwarded-for': 'F601:204:c702:5f87:3d3d:d184:f486:1e8a' };
      return postP("http://localhost:8080/api/getgames", {}, headers);
    }).then(function(res) {
      res.body.should.be.instanceof(Array);
      res.body.should.be.length(0);
    }).then(done, done);
  });


  describe("getGames2", function() {

    it("getGames2 should return ip if 1 inform", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "4567"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2");
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("10.2.3.4:4567");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("::ffff:127.0.0.1");
      }).then(done, done);
    });

    it("getGames2 should return 2 ips if 2 informs", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.6.7.8"], port:"2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "5432"});
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2");
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(2);
        res.body.gameIps.should.containEql("10.2.3.4:5432");
        res.body.gameIps.should.containEql("10.6.7.8:2345");
      }).then(done, done);
    });

    it("getGames2 should return 2 ips if on inform with 2 addresses", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.6.7.8", "10.2.3.4"], port:"2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2");
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(2);
        res.body.gameIps.should.containEql("10.2.3.4:2345");
        res.body.gameIps.should.containEql("10.6.7.8:2345");
      }).then(done, done);
    });

    it("getGames should return 2 ips if 2 informs with same ip different ports", function(done) {
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "2345"}).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "5432"});
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames");
      }).then(function(res) {
        res.body.should.be.instanceof(Array);
        res.body.should.be.length(2);
        res.body.should.containEql("10.2.3.4:5432");
        res.body.should.containEql("10.2.3.4:2345");
      }).then(done, done);
    });

    it("getGames2 should return 1 ips each if 2 informs with same different ip addresses", function(done) {
      var headers1 = { 'x-forwarded-for': '2.2.2.2' };
      var headers2 = { 'x-forwarded-for': '3.3.3.3' };
      postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.4"], port: "2345"}, headers1).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["10.2.3.5"], port: "2345"}, headers2);
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2", {}, headers1);
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("10.2.3.4:2345");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("2.2.2.2");
        return postP("http://localhost:8080/api/getgames2", {}, headers2);
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("10.2.3.5:2345");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("3.3.3.3");
      }).then(done, done);
    });

    it("getGames2 should return ip if 1 inform ipv6 test 2", function(done) {
      var headers = { 'x-forwarded-for': '2001:db86:0:d0::693:9005' };
      postP("http://localhost:8080/api/inform2", {addresses:["[FD01:db86:0:d0::691:9001]"], port: "4455"}, headers).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2", {}, headers);
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("[FD01:db86:0:d0::691:9001]:4455");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("2001:db86:0:d0::693:9005");
      }).then(done, done);
    });

    it("getGames2 should return 1 ip each if 2 informs for 2 ipv6", function(done) {
      var headers1 = { 'x-forwarded-for': '2001:db86:0:d0::693:9005' };
      var headers2 = { 'x-forwarded-for': '2001:db86:0:d1::693:9005' };
      postP("http://localhost:8080/api/inform2", {addresses:["[FD01:db86:0:d0::691:9001]"], port: "4455"}, headers1).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/inform2", {addresses:["[FD01:db86:0:d0::691:9004]"], port: "4455"}, headers2);
      }).then(function(res) {
        res.body.ip.length.should.be.above(6);
        return postP("http://localhost:8080/api/getgames2", {}, headers1);
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("[FD01:db86:0:d0::691:9001]:4455");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("2001:db86:0:d0::693:9005");
        return postP("http://localhost:8080/api/getgames2", {}, headers2);
      }).then(function(res) {
        res.body.gameIps.should.be.instanceof(Array);
        res.body.gameIps.should.be.length(1);
        res.body.gameIps.should.containEql("[FD01:db86:0:d0::691:9004]:4455");
        res.body.publicIps.should.be.instanceof(Array);
        res.body.publicIps.should.be.length(1);
        res.body.publicIps.should.containEql("2001:db86:0:d1::693:9005");
      }).then(done, done);
    });

  });
});

