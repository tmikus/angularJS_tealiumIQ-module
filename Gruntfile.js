module.exports = function (grunt)
{
    grunt.initConfig(
    {
        bowerConfig: grunt.file.readJSON("package.json"),

        clean:
        {
            dist: ['dist']
        },

        concat:
        {
            "src-to-dist":
            {
                options:
                {
                    separator: '\n'
                },
                files:
                [
                    {
                        src:
                        [
                            'src/**.js'
                        ],
                        dest: 'dist/angular-tealium.js'
                    }
                ]
            }
        },

        uglify:
        {
            "dist":
            {
                options:
                {
                    compress:
                    {
                        cascade: true,
                        comparisons: true,
                        conditionals: true,
                        dead_code: true,
                        drop_console: true,
                        evaluate: true,
                        pure_getters: true,
                        unsafe: true,
                        unused: true
                    },
                    mangle:
                    {
                        eval: true,
                        toplevel: true
                    }
                },
                files:
                {
                    "dist/angular-tealium.min.js": "dist/angular-tealium.js"
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ['clean:dist', 'concat:src-to-dist', 'uglify:dist']);
};