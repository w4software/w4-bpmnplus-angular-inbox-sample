module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  grunt.config.init(
  {
    pkg: grunt.file.readJSON('package.json'),

    wiredep:
    {
      app:
      {
        src: ["index.html"],
      }
    },

  });

  grunt.registerTask('build', ['wiredep']);

};