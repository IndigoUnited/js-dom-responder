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
        'amd-utils': '../components/amd-utils/src',
        'dejavu': '../components/dejavu/dist/amd/strict',
        'events-emitter': '../components/events-emitter/src/',
        'has': '../components/has/has',
        'base-adapter': '../components/base-adapter/src/adapters/jquery',
        'base-adapter/src': '../components/base-adapter/src',
        'UseYUI': '../node_modules/base-adapter-libs/yui3/UseYUI',
        'zepto': '../node_modules/base-adapter-libs/zepto/zepto',
        'jquery': '../node_modules/base-adapter-libs/jquery/jquery',
        'mootools-core': '../node_modules/base-adapter-libs/mootools/mootools-core',
        'dojo': '../node_modules/base-adapter-libs/dojo/dojo',
        'yui3': '../node_modules/base-adapter-libs/yui3/yui3',
        'src': '../src'
    },
        map = {
            'base-adapter': {
                'base-adapter/src': '../components/base-adapter/src'
            }
        },
        shim = {
            'zepto': {
                exports: 'Zepto'
            }
        };

    if (/ie/i.test(navigator.userAgent)) {
        global.Zepto = function () {};
        paths.zepto = '../vendor/base-adapter-libs/zepto/dummy';
    }

    require({
        baseUrl: './',
        paths: paths,
        map: map,
        shim: shim,
        YUI: { src: paths.yui3 },
        waitSeconds: (window.location.protocol === 'file:' || window.location.href.indexOf('://localhost') !== -1) ? 5 : 45, // Fail early locally
        urlArgs: 'bust=' + (+new Date())
    });

    window.baseAdapterPath = paths['base-adapter'];

    define(['base-adapter/dom/Utilities', 'has'], function (Utilities, has) {

        has.add('debug', !!window.console && !!console.info && !!console.log);

        Utilities.ready(function () {
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