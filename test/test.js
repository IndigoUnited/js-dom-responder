/*jshint strict:false, node:true*/

// If we are at node then we use phantomjs + mocha-phantomjs
if (!(typeof window !== 'undefined' && window.navigator && window.document)) {
    var fs = require('fs');
    var cp = require('child_process');

    var phantomjsBin = __dirname + '/../node_modules/.bin/phantomjs';
    var command = phantomjsBin + ' --web-security=no ' + __dirname + '/../node_modules/mocha-phantomjs/lib/mocha-phantomjs.coffee ' + 'test/tester.html';
    var tests;

    fs.stat(phantomjsBin, function (error) {
        if (error) {
            phantomjsBin = 'phantomjs';
        }

        if (process.platform === 'win32') {
            tests = cp.spawn('cmd', ['/s', '/c', command], { customFds: [0, 1, 2] });
        } else {
            tests = cp.spawn('sh', ['-c', command], { customFds: [0, 1, 2] });
        }
        tests.on('exit', function (code) {
            process.exit(code ? 1 : 0);
        });
    });
} else {
    var paths = {
        'mout': '../components/mout/src',
        'events-emitter': '../components/events-emitter/src/',
        'has': '../components/has/has',
        'jquery': '../components/jquery/jquery',
        'src': '../src'
    };

    require({
        baseUrl: './',
        paths: paths,
        waitSeconds: (window.location.protocol === 'file:' || window.location.href.indexOf('://localhost') !== -1) ? 5 : 45, // Fail early locally
        urlArgs: 'bust=' + (+new Date())
    });

    define(['jquery', 'has'], function ($, has) {

        has.add('debug', !!window.console && !!console.info && !!console.log);

        $(document).ready(function () {
            require(['specs/basic'], function () {
                if (window.mochaPhantomJS) {
                    mochaPhantomJS.run();
                } else {
                    mocha.run();
                }
            });
        });
    });
}