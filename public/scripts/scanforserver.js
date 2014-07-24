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

var main = function(Cookie, IO, IPUtils, ProgressBar) {
  var $ = function(id) {
    return document.getElementById(id);
  };

  var nameCookie = new Cookie("name");
  var startingPort = 1;
  var endingPort = 254;
  var numPortsInProgress = 0;
  var maxSimultaneousPorts = 4;
  var timeout = 200; // in ms

  var progressBar = new ProgressBar($("scan-progress"));

  var scan = function(ipAddresses) {
    if (ipAddresses.length == 0) {
      // Check the most common home class C ip addresses.
      ipAddresses = [
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
    }

    var portsPerIP = endingPort - startingPort + 1;
    var totalNumPortsToScan = ipAddresses.length * portsPerIP;
    var numPortsScanned = 0;
    var found = false;

    var checkPort = function(url) {
      return function (exception, obj) {
        if (found) {
          return;
        }

        ++numPortsScanned;
        progressBar.set(numPortsScanned / totalNumPortsToScan);

        --numPortsInProgress;
        scanMorePorts();

        if (exception) {
        } else if (obj.version == "0.0.0" &&
                   obj.id == "HappyFunTimes") {
          found = true;
          name = nameCookie.get() || "";
          window.location.href = url + "/enter-name.html?fromHFTNet=true&name=" + encodeURIComponent(name);
        }

        if (numPortsScanned >= totalNumPortsToScan) {
          var elements = document.querySelectorAll(".hidden");
          for (var ii = 0; ii < elements.length; ++ii) {
            var elem = elements[ii];
            elem.style.display = "block";
          }
        }
        return;
      };
   };

   var urlsToScan = [];
    for (var jj = 0; jj < ipAddresses.length; ++jj) {
      var classRE = /\d+\.\d+\.\d+\./;
      var classCBase = classRE.exec(ipAddresses[jj])[0];

      // Let's just assume we're on the same class C network.
      for (var ii = startingPort; ii <= endingPort; ++ii) {
        var url = "http://" + classCBase + ii + ":8080";  // how do we choose a good port?
        urlsToScan.push(url);
      }
    }

    var scanMorePorts = function() {
      while (urlsToScan.length && numPortsInProgress < maxSimultaneousPorts) {
        ++numPortsInProgress;
        var url = urlsToScan.shift();
        //console.log("checking: " + url);
        IO.sendJSON(url, {cmd: 'happyFunTimesPing'}, checkPort(url), { timeout: timeout });
      }
    };

    scanMorePorts();
  };


  IPUtils.getLocalIpAddresses(scan);
};

// Start the main app logic.
requirejs(
  [ './cookies',
    './io',
    './iputils',
    './progress',
  ],
  main
);


