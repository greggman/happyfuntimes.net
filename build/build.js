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
 * THEORY OF2 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

exports.build = function(options) {

var fs        = require('fs');
var minify    = require('html-minifier').minify;
var path      = require('path');
var Promise   = require('promise');
var requirejs = require('requirejs');

var files = [
  { filename: "index.html" },
  { filename: "save-name.html" },
];

var releaseBuildOptions = {
  jsOptions: {
    baseUrl:  ".",
    name:     "almond.js",
    wrap:     true,
  },
  htmlOptions: {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    preserveLineBreaks: true,
    minifyCSS: true,
  },
};

var debugBuildOptions = {
  jsOptions: {
    baseUrl:  ".",
    name:     "almond.js",
    optimize: "none",
    wrap:     true,
  },
  htmlOptions: {
    removeComments: false,
    collapseWhitespace: false,
    conservativeCollapse: true,
    preserveLineBreaks: true,
    minifyCSS: false,
  },
};

var buildOptions = options.makeDebugVersion ? debugBuildOptions : releaseBuildOptions;

var concatJS = function(src) {
  var cwd = process.cwd();
  var tmp = "tmptmptmptmp.js";
  process.chdir(path.dirname(src));
  var config = buildOptions.jsOptions;
  config.include = path.basename(src);
  config.insertRequire = [path.basename(src)];
  config.out = tmp;
  var cleanup = function() {
    var content;
    if (fs.existsSync(tmp)) {
      content = fs.readFileSync(tmp, {encoding: "utf-8"});
      fs.unlinkSync(tmp);
    }
    process.chdir(cwd);
    return content;
  };
  return new Promise(function(resolve, reject) {
    requirejs.optimize(config, function (buildResponse) {
      resolve(cleanup());
    }, function(err) {
      cleanup();
      reject(err);
    });
  });
};

function writeFileIfDifferent(filename, content) {
  if (fs.existsSync(filename)) {
    var orig = fs.readFileSync(filename, {encoding: "utf8"});
    if (orig === content) {
      return;
    }
  }
  fs.writeFileSync(filename, content);
  console.log("wrote:", filename);
}

var srcBase = path.join(__dirname, "..", "src");
var dstBase = path.join(__dirname, "..", "public");
var scriptRE = /<script data-main="(.*?)" src="scripts\/require.js"><\/script>/;
var cssRE    = /<link rel="stylesheet" href="(.*?)">/g;

// Copy almond out of node_modules because I can't effing figure out how to set r.js's config
// in such a way that I can leave it where it is >:(
writeFileIfDifferent(path.join(srcBase, "scripts/almond.js"),
    fs.readFileSync(path.join(__dirname, "../node_modules/almond/almond.js"), {encoding: "utf-8"}));


return new Promise(function(resolve, reject) {
  files.map(function(file) {
    return function() {
      var srcName = path.join(srcBase, file.filename);
      console.log("read : " + srcName);
      var html = fs.readFileSync(srcName, {encoding: "utf-8"});
      var html = html.replace(cssRE, function(match, p1) {
        console.log("found: " + p1);
        return "<style>\n" + fs.readFileSync(path.join(srcBase, p1), {encoding: "utf-8"}) + "\n</style>\n";
      });
      var m = scriptRE.exec(html);
      var script = m[1];
      console.log("found: " + script);
      return concatJS(path.join(srcBase, script))
      .then(function(scriptContent) {
        html = html.replace(scriptRE, "<script>\n" + scriptContent + "\n</script>\n");
        html = minify(html, buildOptions.htmlOptions);
        var dstName = path.join(dstBase, file.filename);
        writeFileIfDifferent(dstName, html);
      })
      .catch(function(err) {
        console.error(err);
        console.error(err.stack);
      });
    };
  }).reduce(function(cur, next){
    return cur.then(next);
  }, Promise.resolve()).then(function(){
    resolve();
  });
});

};


