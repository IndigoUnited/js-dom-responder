var paths = {
    'amd-utils': '../components/amd-utils/src',
    'dejavu': '../components/dejavu/dist/amd/strict',
    'events-emitter': '../components/events-emitter/src/',
    'base-adapter': '../components/base-adapter/src/adapters/jquery',
    'base-adapter/src': '../components/base-adapter/src',       // This is needed in order to access the triggerEvent utility for the tests..
    'UseYUI': '../node_modules/base-adapter-libs/yui3/UseYUI',
    'zepto': '../node_modules/base-adapter-libs/zepto/zepto',
    'jquery': '../node_modules/base-adapter-libs/jquery/jquery',
    'mootools-core': '../node_modules/base-adapter-libs/mootools/mootools-core',
    'dojo': '../node_modules/base-adapter-libs/dojo/dojo',
    'yui3': '../node_modules/base-adapter-libs/yui3/yui3',
    'domReady': '../node_modules/domReady/domReady',
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

if (!(typeof window !== 'undefined' && window.navigator && window.document)) { // Test if we are at command line
    console.info('DOMResponder can\'t be tested using the command line (maybe later with PhantomJS)');
    console.info('Use the browser instead.');

    process.exit();
} else {
    global = window;
    global.expect = expect;
    global.browser = true;

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
}

global.evaluated = true;
global.baseAdapterPath = paths['base-adapter'];