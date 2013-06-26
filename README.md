# DOMResponder

Observe and respond to DOM events efficiently.

This library is a low-level component to be used in hierarchial views.
The concept is very simple. Multiple instances can be linked together and declare their events individually.
No matter how many `click` events the instances along the tree listen, only one `click` is attached to the DOM by the root instance.

The root instance effictivelly manages all descendants events, taking the delegation one step further. This allows descendants view to listen to their own
events without having to worry about how many events are attached to the DOM.



## API

### DomResponder#getElement()

Returns the element associated with the instance.


### DomResponder#on(event, fn, $context)

Register an `event` listener `fn` (with the option to pass a `$context`).
The event name can contain a selector to be used for delegation (e.g.: `click li.item` will listen for clicks in li elements with the `item` class)


### DomResponder#off($event, $fn, $context)

Remove `event` listener `$fn` that was added with `$context`.
If no `$fn` is passed, removes all listeners for `$event` or all the emitter listeners if no `$event` is passed.


### DomResponder#hasListener(event, $fn)

Checks if the listener `$fn` for event `event` is registered.
If no `$fn` is passed, returns true if at least one listener is registered for `event`.


### DomResponder#addChild(responder)

Adds a `responder` as its child.


### DomResponder#removeChild(responder)

Removes a `responder` as its child.


### DomResponder#removeChildren()

Removes all child responders.


### DomResponder#hasChild(responder)

Check if a `responder` is a child of the instance.


### DomResponder#listen()

Listen to all registered events as well as descendant events, acting as a proxy to them.


### DomResponder#unlisten()

Stops listening to all registered events as well as descendant events.


### DomResponder#isListening()

Check if the instance is currently listening for events.


### DomResponder#hasManager()

Check if the instance is not listening but has a manager proxying the events for it.


### DomResponder#destroy()

Destroys the instance.
Stops and remove listeners, removes all children and cleans other resources.



## Testing

The tests are built on top of [mocha](http://visionmedia.github.com/mocha/) test framework and the [expect.js](https://github.com/LearnBoost/expect.js) assert library.

First run `npm install` and `bower install` to install all the tools needed.
Then simply open the `test/tester.html` file in the browser.
To test via node run `npm test`.



## How to use

For now, this library is only available in the [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) format.   
DomResponder depends on [events-emitter](https://github.com/IndigoUnited/events-emitter), [jquery](https://github.com/jquery/jquery) and [has](https://github.com/phiggins42/has).

If you use RequireJS specify them like this:

```js
// ...
paths : {
   'events-emitter': '../components/events-emitter/src',
   'has': '../components/has/has'
   'jquery': '../components/jquery/jquery'
}
// ...
```

Note that if you want to support `IE8` you will need to install [es5-shim](https://github.com/kriskowal/es5-shim.git) and require both `es5-shim` and `es5-sham` with your AMD loader before requiring this library.



## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
