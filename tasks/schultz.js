/*
 * grunt-schultz
 * https://github.com/reputation.com/grunt-schultz
 *
 * Copyright (c) 2012 Reputation.com
 * Authored by: Jeff Harnois jeff.harnois@reputation.com
 * Licensed under the MIT license.
 * "I know nuzzing!"
 */

module.exports = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/cowboy/grunt/blob/master/docs/toc.md
  
  // ==========================================================================
  // GLOBAL VARS
  // ==========================================================================
  var util = require('util'),
      file = grunt.file,
      log = grunt.log,
      config = grunt.config;

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('schultz', 'Grab css files, convert them to JSON, and replace the classes in a file with inline styles.', function() {
    if (!this.data) { return false; }
    
    if (this.file.dest[this.file.dest.length - 1] === '/') {
      grunt.fatal('never use path as filename');
      return false;
    }

    var files = grunt.file.expand(this.file.src);

    grunt.file.write(this.file.dest, grunt.helper('schultz', files));

    // Fail task if errors were logged.
    if (this.errorCount) { return false; }

    // Otherwise, print a success message.
    grunt.log.writeln('File "' + this.file.dest + '" created.');
    
  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  grunt.registerHelper('joss', function(file) {
    var parserlib = require('parserlib'),
        contents = '',
        currentRule = {},
        css = {};
    var parser = new parserlib.css.Parser();
    
    parser.addListener("startrule", function(event){
      for (var i=0,len=event.selectors.length; i < len; i++){
         var selector = event.selectors[i];
         currentRule = selector.text;
      }
    });
    
    parser.addListener("property", function(event){
        // check to see if we have a relative url('') anywhere [ !== url('//') ] and add a mustache var to resolve the path
        if (event.value.text.indexOf('url(\'/') !== -1 && event.value.text.indexOf('url(\'//') === -1) {
          var str = event.value.text;
          var s = str.slice(0,5);
          var e = str.slice(6,str.length);
          event.value.text = s+'//{{cdn}}/'+e;
        }
        // check to see if the rule already has a property
        var currProp = css[currentRule] || '';
        // save the property and value to the rule.
        css[currentRule] = currProp + event.property.text + ': ' + event.value.text + (event.important ? "!important" : "") + ';';
    });
    
    parser.parse(grunt.file.read(file));
    
    return css;
  });
  
  grunt.registerHelper('schultz', function(files) {
    var $ = require('jQuery'),
        contents = '',
        css = {};
    files.css.map(function(filepath) {
      var raw = grunt.file.read(filepath);
        // send css to Joss to be converted into an object
        css[filepath] = grunt.helper('joss', filepath);
    });
    files.tpl.map(function(filepath) {
      var raw = grunt.file.read(filepath);
      // save the file content to a jquery instance so that we can simply use jquery selectors
      $(raw).appendTo('body');
      $.each(css, function(key, value) {
        for (var i in value) {
          // save the current inline style if it exists
          var attr = $(i).attr('style') || '';
          // append the new style with the old style
          $(i).attr('style',attr+value[i]);
        }
      });
      contents += $('body').html();
    });
    
    return contents;
  });

};