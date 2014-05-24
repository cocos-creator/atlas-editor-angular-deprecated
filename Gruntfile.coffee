module.exports = (grunt) ->

    # load task-plugins
    grunt.loadNpmTasks 'grunt-contrib-clean'
    grunt.loadNpmTasks 'grunt-contrib-concat'
    grunt.loadNpmTasks 'grunt-contrib-copy'
    grunt.loadNpmTasks 'grunt-contrib-cssmin'
    grunt.loadNpmTasks 'grunt-contrib-jshint'
    grunt.loadNpmTasks 'grunt-contrib-uglify'
    grunt.loadNpmTasks 'grunt-sass'

    # load tasks 
    # grunt.loadTasks 'tasks'

    # Project configuration.
    grunt.initConfig

        # variables
        pkg: grunt.file.readJSON 'package.json'
        files:
            js:
                src: [
                    'src/js/AtlasCtrl.js',
                    'src/js/editor.js',
                    'src/js/app.js',
                ]
                dev: 'bin/js/atlas-editor.dev.js'
                min: 'bin/js/atlas-editor.min.js'

        # task configuration

        # clean
        clean:
            bin:
              src: ['bin/**/*']

        # jshint
        jshint:
            check: 
                src: '<%= files.js.src %>'

        # concat
        concat: 
            build:
                src: '<%= files.js.src %>'
                dest: '<%= files.js.dev %>'

        # uglify
        uglify: 
            build:
                src: '<%= files.js.dev %>'
                dest: '<%= files.js.min %>'

        # sass
        sass:
            build:
                options:
                    includePaths: ['src/scss']
                files:
                    'bin/css/main.css': 'src/scss/main.scss'
            build_min:
                options:
                    includePaths: ['src/scss', 'ext/foundation/scss/']
                    outputStyle: 'compressed'
                files:
                    'bin/css/foundation.min.css': 'ext/foundation/scss/foundation.scss'
                    'bin/css/normalize.min.css': 'ext/foundation/scss/normalize.scss'
                    'bin/css/main.min.css': 'src/scss/main.scss'

        # cssmin
        cssmin:
            minify:
                expand: true
                cwd: 'bin/css/'
                src: ['**/*.css', '!**/*.min.css']
                dest: 'bin/css/'
                ext: '.min.css'

        # copy
        copy: 
            core:
                expand: true 
                cwd: '../core/bin/' 
                src: ['**/*.js'] 
                dest: 'bin/js/fireball-core/'
                filter: 'isFile'
            js:
                expand: true 
                cwd: 'ext/' 
                src: ['foundation/js/**/*.js', 'angular/**/*.js', 'jquery/dist/*.js', 'paper/dist/paper-core*.js'] 
                dest: 'bin/js/'
                filter: 'isFile'
            fontawesome:
                expand: true 
                cwd: 'ext/fontawesome/' 
                src: ['css/**/*.css', 'fonts/**/*'] 
                dest: 'bin/fontawesome/'
                filter: 'isFile'
            img:
                expand: true 
                cwd: 'src/img/' 
                src: ['**/*'] 
                dest: 'bin/img/'
                filter: 'isFile'

    # Default task(s).
    grunt.registerTask 'default', ['min']

    grunt.registerTask 'min', ['jshint', 'concat', 'uglify', 'copy', 'sass', 'cssmin']
    grunt.registerTask 'dev', ['jshint', 'concat', 'copy', 'sass']
    grunt.registerTask 'all', ['min']

