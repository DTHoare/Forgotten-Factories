module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            server: {
                options: {
                    port: 8080,
                    base: '.'
                }
            }
        },
        concat: {
            phaser: {
                src: [  "src/lib/phaser.js"
                     ],
                dest: 'deploy/js/phaser.js'
            },
            phaserSlope: {
              src: [  "src/lib/phaser-slopes.min.js"
                   ],
              dest: 'deploy/js/phaser-slopes.min.js'
            },
            dist: {
                src: [  "src/class/**/*.js",
                    "src/game/**/*.js"
                     ],
                dest: 'deploy/js/<%= pkg.name %>.js'
            }
        },
        watch: {
            files: 'src/**/*.js',
            tasks: ['concat']
        },
    });

    grunt.registerTask('default', ['concat', 'connect', 'watch']);

}
