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
var server = require('../lib/server');
var should = require('should');

var postP = function(url) {
  return new Promise(function(fulfill, reject) {
    request.post(url, function(err, res, body) {
      if (err || res.statusCode != 200) {
        reject(err || res.body.msg);
      } else {
        fulfill(res, body);
      }
    });
  });
};

describe("server", function() {
  before(function() {
    server.listen(8080);
  });

  after(function() {
    server.close();
  });

  afterEach(function() {
    server.clearGameCache();
  });

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

