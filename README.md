# DOMResponder #
---

Observe and respond to DOM events efficiently.
It is built on top of [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD).



## API ##

### DomResponder#getElement() ###

Returns the element associated with the instance.


### DomResponder#on(event, fn, $context) ###

Register an `event` listener `fn` (with the option to pass a `$context`).
The event name can contain a selector to be used for delegation (e.g.: `click li.item` will listen for clicks in li elements with the `item` class)


### DomResponder#off($event, $fn, $context) ###

Remove `event` listener `$fn` that was added with `$context`.
If no `$fn` is passed, removes all listeners for `$event` or all the emitter listeners if no `$event` is passed.


### DomResponder#hasListener(event, $fn) ###

Checks if the listener `$fn` for event `event` is registered.
If no `$fn` is passed, returns true if at least one listener is registered for `event`.


### DomResponder#addChild(responder) ###

Adds a `responder` as its child.


### DomResponder#removeChild(responder) ###

Removes a `responder` as its child.


### DomResponder#removeChildren() ###

Removes all child responders.


### DomResponder#hasChild(responder) ###

Check if a `responder` is a child of the instance.


### DomResponder#listen() ###

Listen to all registered events as well as descendant events, acting as a proxy to them.


### DomResponder#unlisten() ###

Stops listening to all registered events as well as descendant events.


### DomResponder#isListening() ###

Check if the instance is currently listening for events.


### DomResponder#hasManager() ###

Check if the instance is not listening but has a manager proxying the events for it.

### DomResponder#destroy() ###

Destroys the instance.
Stops and remove listeners, removes all children and cleans other resources.



## Testing ##

The tests are built on top of [mocha](http://visionmedia.github.com/mocha/) test framework and the [expect.js](https://github.com/LearnBoost/expect.js) assert library.

First run `npm install` and `bower install` to install all the tools needed.
Then simply open the `test/tester.html` file in the browser.
To test via node run `npm test`.


## Dependencies ##

BaseAdapter depends on [mout](https://github.com/mout/mout), [dejavu](https://github.com/IndigoUnited/dejavu) and [base-adapter](https://github.com/IndigoUnited/base-adapter).
If you use RequireJS specify them like this:

```js
    paths : {
        'mout': '../vendor/mout/src'
        'dejavu': '../vendor/dejavu/dist/amd/strict',                  // use the loose version in production
        'base-adapter': '../vendor/base-adapter/src/adapters/jquery',  // use one of the available adapters
        'jquery': '../vendor/jquery/jquery.js'                         // use one of the base libraries
    },
```

Aditionally you have to specify the following map:

```js
    map: {
        '*': {
            'base-adapter/src': '../vendor/base-adapter/src'
        }
    },
```



## License ##

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).