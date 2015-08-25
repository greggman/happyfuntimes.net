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

/*eslint no-use-before-define:0*/

"use strict";

// URL options:
//    debug=true    : contact local host, print stuff
//    verbose=true  : print stuff
//    local=true    : contact local.superhappyfuntimes.net
//    scan=false    : don't scan
//    go=false      : don't go to url

// Start the main app logic.
requirejs(
  [ './cookies',
    './io',
    './iputils',
    './misc',
    './progress',
    './strings',
  ], function(Cookie, IO, IPUtils, misc, ProgressBar, Strings) {
  var $ = document.getElementById.bind(document);

  var g = misc.parseUrlQuery();
  var log = (g.debug || g.verbose) ? console.log.bind(console) : function() { };

  var getGamesUrl = window.location.origin + "/api/getgames";
  if (g.debug) {
    getGamesUrl = "http://localhost:1337/api/getgames";
  }
  if (g.local) {
    getGamesUrl = "http://local.happyfuntimes.net/api/getgames";
  }
  var nameCookie = new Cookie("name");
  var startingAddress = 1;
  var endingAddress = g.debug ? 5 : 254;
  var numRequestsInProgress = 0;
  var maxSimultaneousRequests = 4;
  var timeout = 2000; // in ms
  var port = 18679;
  var found = false;
  var inApp = g.cordovaurl !== undefined;

  var fastScanAddresses = [];
  var fullScanAddresses = [];
  var totalThingsToDo = 0;
  var totalThingsDone = 0;

  var progressBar = new ProgressBar($("scan-progress"));
  progressBar.show(true);
  $("try").href = window.location.href;

  if (inApp) {
    $("about").style.display = "none";
    //$("about").addEventListener('click', function(e) {
    //  e.preventDefault();
    //  window.open(e.target.href, '_system');
    //}, false);
  }

  var handleCouldNotFind = function() {
    Array.prototype.forEach.call(document.querySelectorAll(".hidden"), function(elem) {
      elem.style.display = "block";
    });
  };

  /**
   * should call this after every request as it not only updates
   * the progress bar but also accounting of requests.
   */
  var updateProgress = function() {
    ++totalThingsDone;
    --numRequestsInProgress;
    progressBar.set(totalThingsDone / totalThingsToDo);

    if (!found && totalThingsDone >= totalThingsToDo) {
      handleCouldNotFind();
    }
  };

  /**
   * Deal with response from hft.net
   */
  var checkHFTResponse = function(err, obj) {
    log("hft response: " + JSON.stringify(obj));
    // It was bad
    if (err) {
      console.error(err);
      // start scanning
      getIpAddress();
      return;
    }

    checkGamesRunning(obj);
  };

  var getIpAddress = function() {
    //if (g.scan !== false && g.scan !== "false") {
    if (g.scan) {
      IPUtils.getLocalIpAddresses(scan);
    } else {
      handleCouldNotFind();
    }
  };

  var makeUrl = function(baseUrl) {
    var name = nameCookie.get() || "";
    return baseUrl + "/enter-name.html" + misc.objectToSearchString({
      fromHFTNet: true,
      name: name,
      cordovaurl: g.cordovaurl,
      restarturl: g.restarturl,
      origin: window.location.href,
    });
  };

  var makeUrlFromHFT = function(hft) {
    return makeUrl("http://" + hft.ipAddress);
  };

  /**
   * HFT send back the list of games running on a certain network.
   * Check if they all respond. If there's only one go to it.
   * If there's more than one let the user select. If zero then
   * scan.
   */
  var checkGamesRunning = function(ipAddresses) {
    // Check each ipAddress returned.
    var runningHFTs = [];
    var names = {};
    var numChecked = 0;

    var checkNextHFT = function() {
      if (numChecked === ipAddresses.length) {
        progressBar.show(false);
        if (runningHFTs.length === 0) {
          // There was nothing, start scanning
          getIpAddress();
        } else if (runningHFTs.length === 1) {
          goToUrl(makeUrlFromHFT(runningHFTs[0]));
        } else {
          askPlayerWhichHFT(runningHFTs);
        }
        return;
      }

      var ipAddress = ipAddresses[numChecked++];
      makeHFTPingRequest(ipAddress, function(ipAddress) {
        log("ping hft: " + ipAddress);
        return function(err, obj) {
          if (!err) {
            var name = obj.serverName;
            var add = true;
            if (name) {
              if (names[name]) {
                add = false;
              } else {
                names[name] = true;
              }
            }

            if (add) {
              runningHFTs.push({
                ipAddress: ipAddress,
                data: obj,
              });
            }
          }
          progressBar.set(numChecked / ipAddresses.length);
          checkNextHFT();
        };
      }(ipAddress));
    };
    checkNextHFT();
  };

  var askPlayerWhichHFT = function(runningHFTs) {
    log("ask player to choose hft: " + JSON.stringify(runningHFTs, undefined, "  "));
    $("looking").style.display = "none";
    var template = $("hft-button-template").text;
    var html = runningHFTs.map(function(hft, ndx) {
      return Strings.replaceParams(template, {
        id: "game-" + ndx,
        url: makeUrlFromHFT(hft),
        name: hft.data.serverName || "*unknown*",
        ipAddress: g.verbose ? hft.ipAddress : "",
      });
    });
    $("multiple-hfts").style.display = "block";
    $("systems").innerHTML = html.join("\n");
  };

  log("checking: " + getGamesUrl);
  IO.sendJSON(getGamesUrl, {}, checkHFTResponse, { timeout: 5000 });

  var scan = function(ipAddresses) {
    if (ipAddresses) {
      addFullScans(ipAddresses);
    }

    addFastScans();
  };

  // Check the most common home class C ip addresses.
  var commonIpAddresses = [
    "192.168.0.0",    // D-Link, Linksys, Netgear, Senao, Trendtech,
    "192.168.1.0",    // 3com, Asus, Dell, D-Link, Linksys, MSI, Speedtouch, Trendtech, US Robotics, Zytel,
    "192.168.2.0",    // Belkin, Microsoft, Trendtech, US Robotics, Zyxel,
    "192.168.10.0",   // Motorola, Trendtech, Zyxel
    "192.168.11.0",   // Buffalo
    "10.0.0.0",       // Speedtouch, Zyxel,
    "10.0.1.0",       // Apple, Belkin, D-Link

    "192.168.20.0",   // Motorola
    "192.168.30.0",   // Motorola
    "192.168.50.0",   // Motorola
    "192.168.62.0",   // Motorola
    "192.168.100.0",  // Motorola
    "192.168.101.0",  // Motorola
    "192.168.4.0",    // Zyxel
    "192.168.8.0",    // Zyxel
    "192.168.123.0",  // US Robotics
    "192.168.254.0",  // Flowpoint
  ];

  if (g.debug) {
    commonIpAddresses = [
      "192.168.0.0",
      "10.0.0.0",
      "192.168.123.0",
    ];
  }

  var addFastScans = function() {
    // Check these addresses first
    var commonCClassParts = [1, 2, 3, 10, 11, 12, 20, 21, 22, 50, 51, 52, 100, 101, 102, 150, 151, 152, 200, 201, 202];

    commonIpAddresses.forEach(function(ipAddress) {
      commonCClassParts.forEach(function(cClassPart) {
        fastScanAddresses.push(ipAddress.replace(/\d+$/, cClassPart));
        ++totalThingsToDo;
      });
    });
    doNextThing();
  };

  var addFullScans = function(ipAddresses) {
    log("addFullScan: " + ipAddresses);
    ipAddresses.forEach(function(ipAddress) {
      for (var ii = startingAddress; ii <= endingAddress; ++ii) {
        fullScanAddresses.push(ipAddress.replace(/\d+$/, ii));
        ++totalThingsToDo;
      }
    });
    doNextThing();
  };

  var goToUrl = function(url) {
    found = true;
    log("**GOTO** url: " + url);
    if (!g.debug && g.go !== false && g.go !== "false") {
      window.location.href = url;
    }
  };

  var checkGoodResponse = function(url) {
    goToUrl(makeUrl(url));
  };

  var fastScanCheckAddress = function(url, ipAddress) {
    var timeSent = Date.now();
    return function(err, obj) {
      updateProgress();

      if (found) {
        return;
      }

      if (err) {
        // it wasn't the correct place BUT did we timeout?
        var now = Date.now();
        var elapsedTime = now - timeSent;
        if (elapsedTime < timeout * 0.8) {
          log("fastScan: " + ipAddress + " got fast response");
          // We didn't timeout which means we probably got a rejected from some machine
          // So do a fullscan of this network

          // Remove all pending fastScans for this ip
          var prefix = ipAddress.replace(/\.\d+$/, '.');
          fastScanAddresses = fastScanAddresses.filter(function(address) {
            var keep = address.substring(0, prefix.length) !== prefix;
            if (!keep) {
              updateProgress();
            }
            return keep;
          });

          addFullScans([ipAddress]);
        } else {
          doNextThing();
        }
      } else {
        checkGoodResponse(url, obj);
      }
    };
  };

  var fullScanCheckAddress = function(url, ipAddress) {
    return function(err, obj) {
      updateProgress();

      if (found) {
        return;
      }

      if (err) {
        log("fullScan: " + ipAddress + " failed");
        doNextThing();
      } else {
        checkGoodResponse(url, obj);
      }
    };
  };

  var makeHFTPingRequest = function(ipAndPort, fn) {
    var url = "http://" + ipAndPort;
    IO.sendJSON(url, {cmd: 'happyFunTimesPing'}, function(err, obj) {
      if (!err) {
        if (obj.version !== "0.0.0") {
          err = "bad api version: " + obj.version;
        } else if (obj.id !== "HappyFunTimes") {
          err = "bad id: " + obj.id;
        }
      }

      fn(err, obj);
    }, { timeout: timeout });
  };

  var startScan = function(ipAddress, fn) {
    ++numRequestsInProgress;
    var ipAndPort = ipAddress + ":" + port;
    makeHFTPingRequest(ipAndPort, fn("http://" + ipAndPort, ipAddress));
  };

  var doNextThing = function() {
    // If there are fullScan things do those
    if (fullScanAddresses.length) {
      log("fullScan: " + fullScanAddresses[0]);
      startScan(fullScanAddresses.shift(), fullScanCheckAddress);
    } else if (fastScanAddresses.length) {
      // If there are fastScan things do those
      log("fastScan: " + fastScanAddresses[0]);
      startScan(fastScanAddresses.shift(), fastScanCheckAddress);
    }

    if (numRequestsInProgress < maxSimultaneousRequests &&
        (fastScanAddresses.length || fullScanAddresses.length)) {
      doNextThing();
    }
  };
});



