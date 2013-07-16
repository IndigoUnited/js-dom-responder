# DOMResponder [![Build Status](https://secure.travis-ci.org/IndigoUnited/dom-responder.png?branch=master)](http://travis-ci.org/IndigoUnited/dom-responder)

Observe and respond to DOM events efficiently.

This library is a low-level component to be used in hierarchial views.
The concept is very simple. Multiple instances can be linked together and declare their events individually.
No matter how many `click` events the instances along the tree listen, only one `click` is attached to the DOM by the root instance.

The root instance effictivelly manages all descendants events, taking the delegation one step further. This allows descendants view to listen to their own
events without having to worry about how many events are attached to the DOM.



## API

### .getElement()

Returns the element associated with the instance.


### .on(event, fn, [context])

Register an `event` listener `fn` (with the option to pass a `context`).
The event name can contain a selector to be used for delegation (e.g.: `click li.item` will listen for clicks in li elements with the `item` class)


### .off([event], [fn], [context])

Remove `event` listener `fn` that was added with `context`.
If no `fn` is passed, removes all listeners for `event` or all the emitter listeners if no `event` is passed.


### .hasListener(event, [fn])

Checks if the listener `fn` for event `event` is registered.
If no `fn` is passed, returns true if at least one listener is registered for `event`.


### .addChild(responder)

Adds a `responder` as its child.


### .removeChild(responder)

Removes a `responder` as its child.


### .removeChildren()

Removes all child responders.


### .hasChild(responder)

Check if a `responder` is a child of the instance.


### .listen()

Listen to all registered events as well as descendant events, acting as a proxy to them.


### .unlisten()

Stops listening to all registered events as well as descendant events.


### .isListening()

Check if the instance is currently listening for events.


### .hasManager()

Check if the instance is not listening but has a manager proxying the events for it.


### .destroy()

Destroys the instance.
Stops and remove listeners, removes all children and cleans other resources.



## How to use

For now, this library is only available in the [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) format.
DomResponder depends on [events-emitter](https://github.com/IndigoUnited/events-emitter), [jquery](https://github.com/jquery/jquery) and [has](https://github.com/phiggins42/has).

If you use RequireJS specify them like this:

```js
// ...
paths : {
   'events-emitter': '../bower_components/events-emitter/src',
   'has': '../bower_components/has/has'
   'jquery': '../bower_components/jquery/jquery'
}
// ...
```

Note that if you want to support `IE8` you will need to install [es5-shim](https://github.com/kriskowal/es5-shim.git) and require both `es5-shim` and `es5-sham` with your AMD loader before requiring this library.


## Tests

1. `bower install`
2. `npm install`
3. `npm test`

You will need [bower](https://github.com/bower/bower) to install the library dependencies.



## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
