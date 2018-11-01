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
  var logElem = $("debug");

  function logToScreen() {
    console.log(str); // eslint-disable-line
    var str = [].join.call(arguments, " ");
    var div = document.createElement("div");
    div.textContent = str;
    logElem.appendChild(div);
  }

  function getLogToScreen() {
    logElem.style.display = "block";
    return logToScreen;
  }

  var g = misc.parseUrlQuery();
  var log = (g.debug || g.verbose) ? getLogToScreen() : function() { };

  var getGamesUrl = window.location.origin + "/api/getgames2";
  if (g.debug) {
    getGamesUrl = "http://localhost:1337/api/getgames2";
  }
  if (g.local) {
    getGamesUrl = "http://local.happyfuntimes.net/api/getgames2";
  }
  if (g.url) {
    getGamesUrl = g.url;
  }
  var nameCookie = new Cookie("name");
  var timeout = 2000; // in ms
  var inApp = g.cordovaurl !== undefined;

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
    progressBar.set(totalThingsDone / totalThingsToDo);
  };

  /**
   * Deal with response from hft.net
   */
  var checkHFTResponse = function(err, obj) {
    log("hft response: " + JSON.stringify(obj));
    // It was bad
    if (err) {
      console.error(err);  // eslint-disable-line
      handleCouldNotFind();
      return;
    }

    checkGamesRunning(obj);
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
  var checkGamesRunning = function(response) {
    // Check each ipAddress returned.
    var ipAddresses = response.gameIps;
    var runningHFTs = [];
    var names = {};
    var numChecked = 0;
    totalThingsToDo = ipAddresses.length;
    totalThingsDone = 0;

    var checkNextHFT = function() {
      if (numChecked === ipAddresses.length) {
        progressBar.show(false);
        if (runningHFTs.length === 0) {
          handleCouldNotFind();
        } else if (runningHFTs.length === 1) {
          goToUrl(makeUrlFromHFT(runningHFTs[0]));
        } else {
          askPlayerWhichHFT(runningHFTs);
        }
        return;
      } else {
        totalThingsDone = numChecked;
        updateProgress();
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

  var goToUrl = function(url) {
    found = true;
    log("**GOTO** url: " + url);
    if (!g.debug && g.go !== false && g.go !== "false") {
      window.location.href = url;
    }
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

});



