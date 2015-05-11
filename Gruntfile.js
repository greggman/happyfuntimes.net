"use strict";

module.exports = function(grunt) {

  grunt.initConfig({
    clean: [
        'public/*',
    ],
    eslint: {
        target: [
          'src/scripts',
          'lib',
          'server.js',
        ],
        options: {
            config: 'build/conf/eslint.json',
            rulesdir: ['build/rules'],
        },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-eslint');

  grunt.registerTask('build', function() {
    var done = this.async();
    var build = require('./build/build');
    build.build({
      makeDebugVersion: grunt.option("hft-debug"),
    }).done(done);
  });

  grunt.registerTask('default', ['eslint', 'clean', 'build']);
};

