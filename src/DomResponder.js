/**
 * DomResponder class.
 *
 * @author André Cruz <andremiguelcruz@msn.com>
 */
define([
    'dejavu/Class',
    'amd-utils/array/indexOf',
    'events-emitter/EventsEmitter',
    'base-adapter/dom/Element',
    'base-adapter/dom/Events',
    'has'
], function (Class, indexOf, EventsEmitter, Element, Events, has) {

    'use strict';

    // TODO: detect circular references?

    var DomResponder = Class.declare({
        $name: 'DomResponder',
        $constants: {
            STORE_KEY: '__dom_responder'
        },

        _element: null,
        _nativeElement: null,
        _events: {},
        _children: [],
        _manager: null,
        _parent: null,

        _eventInfo: {},
        _emitter: null,
        _listening: false,
        _destroyed: false,

        /**
         * Constructor.
         *
         * @param {Element} element The element
         */
        initialize: function (element) {
            this._element = Element.createFrom(element);
            this._nativeElement = Element.getNativeElement(element);

            var responder = Element.data(element, this.$static.STORE_KEY);
            if (has('debug') && responder instanceof DomResponder) {
                throw new Error('A responder is already associated with the element.');
            }

            Element.data(element, this.$static.STORE_KEY, this);
            this._emitter = new EventsEmitter();
        },

        /**
         * Returns the element that is associated with this instance.
         *
         * @return {Element} The element
         */
        getElement: function () {
            return this._element;
        },

        /**
         * Returns the native element that is associated with this instance.
         *
         * @return {Element} The element
         */
        getNativeElement: function () {
            return this._nativeElement;
        },

        /**
         * Adds a listener for a given event.
         * If the listener is already attached, it won't get duplicated.
         *
         * The event name can contain a selector to be used for delegation.
         * (e.g.: 'click li.item' will listen for clicks in li elements with the 'item' class)
         *
         * @param {String}   event      The event name
         * @param {Function} fn         The handler
         * @param {Object}   [$context] The context to be used when calling the handler
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        on: function (event, fn, $context) {
            if (!this._emitter.has(event, fn, $context)) {
                var info = this._extractEventInfo(event, this._eventInfo),
                    tmp = this.$static._nonPropagableEvents[info.type];

                if (has('debug') && tmp === false && info.selector) {
                    throw new Error('Event of type "' + info.type + '" can\'t be delegated, attach it directly instead.');
                }

                this._emitter.on(event, fn, $context);

                tmp = this._events[info.type];

                if (!tmp) {
                    tmp = this._events[info.type] = { count: 1, delegated: {} };

                    if (this._manager) {
                        this._manager._proxyEvent(info.type);
                    } else if (this._listening) {
                        this._attachEvent(info.type);
                    }
                }

                if (info.selector) {
                    tmp.delegated[info.selector] = (tmp.delegated[info.selector] || 0) + 1;
                } else {
                    tmp.count += 1;
                }
            }

            return this;
        },

        /**
         * Removes a previously attached listener of a given event.
         * If no fn and context is passed, removes all event listeners of a given name.
         * If no event is specified, removes all events of all names.
         *
         * @param {String}   [event]    The event name
         * @param {Function} [$fn]      The handler
         * @param {Object}   [$context] The context passed to the on() function
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        off: function ($event, $fn, $context) {
            if (!$fn && arguments.length < 2) {
                this._clearListeners($event);
            } else {
                if (this._emitter.has($event, $fn, $context)) {
                    this._emitter.off($event, $fn, $context);

                    var info = this._extractEventInfo($event, this._eventInfo),
                        tmp = this._events[info.type];

                    if (info.selector) {
                        if (tmp.delegated[info.selector] === 1) {
                            delete tmp.delegated[info.selector];
                            tmp.count -= 1;
                            this._clearTypeIfEmpty(info.type);
                        } else {
                            tmp.delegated[info.selector] -= 1;
                        }
                    } else {
                        tmp.count -= 1;
                        this._clearTypeIfEmpty(info.type);
                    }
                }
            }

            return this;
        },


        /**
         * Check if a listener is attached to a given event name.
         * If no function is passed, it will check if at least one listener is attached.
         * Beware that proxied events won't be accounted.
         *
         * @param {String}   event The event name
         * @param {Function} [$fn] The listener
         *
         * @return {Boolean} True if it is attached, false otherwise
         */
        hasListener: function (event, $fn) {
            return this._emitter.has(event, $fn);
        },

        /**
         * Adds a child responder.
         *
         * @param {DomResponder} responder The responder
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        addChild: function (responder) {
            var pos = indexOf(this._children, responder);

            if (pos === -1) {
                this._children.push(responder);
                responder._parent = this;
                if (this._manager) {
                    responder._setManager(this._manager);
                } else if (this._listening) {
                    responder._setManager(this);
                }
            }
        },

        /**
         * Removes a child responder.
         *
         * @param {DomResponder} responder The responder
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        removeChild: function (responder) {
            var pos = indexOf(this._children, responder);

            if (pos !== -1) {
                this._children[pos]._parent = null;
                this._children[pos]._unsetManager();
                this._children.splice(pos, 1);
            }
        },

        /**
         * Removes all child responders.
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        removeChildren: function () {
            var x,
                length = this._children.length;

            for (x = 0; x < length; x += 1) {
                this._children[x]._parent = null;
                this._children[x]._unsetManager();
            }

            this._children.length = 0;
        },

        /**
         * Checks if a child is declared.
         *
         * @param {DomResponder} responder The child to test
         *
         * @return {Boolean} True if it is, false otherwise
         */
        hasChild: function (responder) {
            return indexOf(this._children, responder) !== -1;
        },

        /**
         * Listen to the registered listeners and act as a proxy of the descendants events.
         * After calling this method on this instance, it will be declared as the manager of all its ancestors.
         *
         * If a descendant is itself a manager, it will be ignored.
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        listen: function () {
            if (!this._listening) {
                this._unsetManager();

                var type,
                    x,
                    length = this._children.length;

                for (x = 0; x < length; x += 1) {
                    this._children[x]._setManager(this);
                }

                for (type in this._events) {
                    this._attachEvent(type);
                }

                this._listening = true;
            }

            return this;
        },

        /**
         * Unlistens to the registered listeners and unproxies descendants events.
         *
         * @return {DomResponder} The instance itself to allow chaining
         */
        unlisten: function () {
            if (this._listening) {
                var type,
                    x,
                    length = this._children.length;

                for (x = 0; x < length; x += 1) {
                    this._children[x]._unsetManager(this);
                }

                for (type in this._events) {
                    this._detachEvent(type);
                }

                this._listening = false;
            }

            return this;
        },

        /**
         * Checks if the instance itself is listening to events.
         * If so, the instance is acting as a manager to its descendants.
         *
         * @return {Boolean} True if it is, false otherwise
         */
        isListening: function () {
            return this._listening;
        },

        /**
         * Checks if the instance has a manager that is proxying the events.
         *
         * @return {Boolean} True if it has, false otherwise
         */
        hasManager: function () {
            return this._manager != null;
        },

        /**
         * Destroys the instance.
         * Stops and remove listeners, removes all children and cleans other resources.
         */
        destroy: function () {
            if (!this._destroyed) {
                this._onDestroy();
                this._destroyed = true;
            }
        },

        /////////////////////////////////////////////////////////////////////////////////////

        /**
         * Sets the responder that will act as a manager for this instance.
         * If the instance itself is already a manager, this method does nothing.
         *
         * @param {DomResponder} responder The manager
         */
        _setManager: function (responder) {
            if (this._listening) {
                return;
            }

            if (this._manager) {
                if (this._manager === responder) {
                    return;
                }
                this._unsetManager();
            }

            this._manager = responder;

            var type,
                x,
                length = this._children.length;

            for (x = 0; x < length; x += 1) {
                this._children[x]._setManager(responder);
            }

            for (type in this._events) {
                this._manager._proxyEvent(type);
            }
        },

        /**
         * Unsets the manager if any.
         */
        _unsetManager: function () {
            if (this._manager) {
                var type,
                    x,
                    length = this._children.length;

                for (type in this._events) {
                    this._manager._unproxyEvent(type);
                }

                for (x = 0; x < length; x += 1) {
                    this._children[x]._unsetManager();
                }

                this._manager = null;
            }
        },

        /**
         * Proxies an event.
         * This method should be called by the descendants on the manager.
         *
         * @param {String} event The event
         */
        _proxyEvent: function (event) {
            if (!this._manager) {
                var info = this._extractEventInfo(event, this._eventInfo),
                    temp = this._events[info.type];

                if (!temp) {
                    this._events[info.type] = { count: 0, proxiedCount: 1, delegated: {} };

                    if (this._listening) {
                        this._attachEvent(info.type);
                    }
                } else {
                    temp.proxiedCount = (temp.proxiedCount || 0) + 1;
                }
            }
        },

        /**
         * Unproxies an event.
         * This method should be called by the descendants on the manager.
         *
         * @param {String} event The event
         */
        _unproxyEvent: function (event) {
            if (!this._manager) {
                var info = this._extractEventInfo(event, this._eventInfo),
                    temp = this._events[info.type];

                if (temp) {
                    temp.proxiedCount = (temp.proxiedCount || 1) - 1;

                    if (!temp.proxiedCount && !temp.count) {
                        delete this._events[info.type];

                        if (this._listening) {
                            this._detachEvent(info.type);
                        }
                    }
                }
            }
        },

        /**
         * Attaches an event.
         *
         * @param {String} type The event type
         */
        _attachEvent: function (type) {
            var tmp = this.$static._nonPropagableEvents[type];

            if (tmp) {
                Events.on(Element.getNativeElement(this._element), type, this._onStaleEvent);
                Events.on(Element.getNativeElement(this._element), type + ' *', this._onStaleEvent);
            } else {
                if (type === 'mouseenter') {
                    Events.on(this._element, 'mouseover', this._onMouseOverOut);
                } else if (type === 'mouseleave') {
                    Events.on(this._element, 'mouseout', this._onMouseOverOut);
                } else {
                    Events.on(this._element, type, this._onEvent);
                }
            }
        },

        /**
         * Detaches an event.
         *
         * @param {String} type The event type
         */
        _detachEvent: function (type) {
            var tmp = this.$static._nonPropagableEvents[type];

            if (tmp) {
                Events.off(this._element, type, this._onStaleEvent);
                Events.off(this._element, type + ' *', this._onStaleEvent);
            } else {
                if (type === 'mouseenter') {
                    Events.off(this._element, 'mouseover', this._onMouseOverOut);
                } else if (type === 'mouseleave') {
                    Events.off(this._element, 'mouseout', this._onMouseOverOut);
                } else {
                    Events.off(this._element, type, this._onEvent);
                }
            }
        },

        /**
         * Special handler for the mouseover and mouseout to be used when
         * mouseenter and mouseleave events need to be caught.
         *
         * @param {Event} event The event
         */
        _onMouseOverOut: function (event) {
            var el = Element.getNativeElement(event.target),
                related = event.relatedTarget;

            event.$type = event.type === 'mouseover' ? 'mouseenter' : (event.type === 'mouseout' ? 'mouseleave' : event.type);

            while (el && el !== docEl) {
                if (related == null || (related && related !== el && !Element.contains(el, related))) {
                    this._onEvent(event, el);
                    el = el.getParent ? el.getParent() : el.parentNode;  // Ugly thing to speed up mootools running IE<=8 without slowing others
                } else {
                    break;
                }
            }
        }.$bound(),

        /**
         * This function treats stale events (events that do not bubble) specially.
         * This is needed because some adapters bubble them wrongly (repeatedly).
         * Please see: http://bugs.jquery.com/ticket/12185
         *
         * @param {Event}   event The event
         * @param {Element} [$el] The element (some libraries pass it)
         */
        _onStaleEvent: function (event, $el) {
            var nativeEvent,
                handledTargets;

            event.$type = this.$static._nonPropagableEventsMappings[event.type] || event.type;

            nativeEvent = Events.getNativeEvent(event);
            handledTargets = nativeEvent.$handledTargets;

            // Solve the bug described above about handlers being called twice.
            if (handledTargets) {
                if (indexOf(handledTargets, this._element) !== -1) {
                    return;
                }
                handledTargets.push(this._element);
            } else {
                handledTargets = nativeEvent.$handledTargets = [this._element];
            }

            this._onEvent(event, $el);
        }.$bound(),

        /**
         * Function to be called when an event occurs on a manager.
         * Firstly, the nearest DomResponder of the target will be found.
         * Afterwards, the event will propagate upwards the hierarchy until it reaches the manager.
         *
         * @param {Event}   event The event
         * @param {Element} [$el] The element (some libraries pass it)
         */
        _onEvent: function (event, $el) {
            var nativeEvent = Events.getNativeEvent(event),
                responder = nativeEvent.$currentResponder,
                target;

            // Find the nearest responder that has the manager equal to this instance
            if (!responder) {
                target = Element.getNativeElement($el || event.target);

                do {
                    responder = Element.data(target, this.$static.STORE_KEY);
                    if (responder && responder._manager === this) {
                        break;
                    }

                    target = target.parentNode;
                } while (target && target !== this._nativeElement && target !== docEl);
            }

            // Once we got the nearest responder, bubble the event across all the responders, including the manager
            while (responder !== this && responder) {
                responder._handleEvent(event, $el);

                // TODO: We can break as soon as we are done by analyzing the delegated proxy count
                // TODO: add suport for stopImmediatePropagation? it could impact the performance significantly and increase complexity for almost no gain.
                if (Events.isPropagationStopped(event)) {
                    return;
                }

                responder = responder._parent;
            }

            this._handleEvent(event, $el);
            nativeEvent.$currentResponder = this._parent;
        }.$bound(),

        /**
         * Function to be called on every DomResponder in the hierarchy when an event occurs.
         * All listeners declared for the event (including with delegation) should be called.
         *
         * @param {Event}   event The event
         * @param {Element} [$el] The element (some libraries pass it)
         */
        _handleEvent: function (event, $el) {
            var selector,
                type = event.$type || event.type,
                temp = this._events[type],
                stale = !!event.$type || this.$static._nonPropagableEvents[type] != null,
                currEl,
                el = $el || event.target,
                wrappedEl;

            el = Element.getNativeElement(el);

            if (temp) {
                temp = temp.delegated;

                // If it is not a stale event than we need iterate over the target parents unti we reach the responder element
                // as soon as all handlers are processed
                // Foreach iteration we match it against all the declared event type selectors
                if (!stale) {
                    for (selector in temp) {
                        currEl = el;

                        while (currEl !== this._nativeElement) {
                            if (Element.is(currEl, selector)) {
                                this._emitter.emit(type + ' ' + selector, event, emitsWrapped ? Element.createFrom(currEl) : currEl);
                                break;  // We follow mootools here and break as soon as it fits.. jquery keeps going at the cost of performance
                            }

                            // TODO: We can break as soon as we are done by analyzing the delegated count
                            currEl = currEl.getParent ? currEl.getParent() : el.parentNode;  // Ugly thing to speed up mootools running IE<=8 without slowing others
                        }
                    }

                    // Done with delegation, fire the event on the instance itself
                    this._emitter.emit(type, event, emitsWrapped ? this._element : this._nativeElement);
                } else {
                    // Stale events are more efficient because they do not bubble, so we dont need to iterator over the target parents
                    if (el === this._nativeElement) {
                        this._emitter.emit(type, event, emitsWrapped ? this._element : this._nativeElement);
                    } else {
                        wrappedEl = emitsWrapped ? Element.createFrom(el) : el;

                        for (selector in temp) {
                            if (Element.is(el, selector)) {
                                this._emitter.emit(type + ' ' + selector, event, wrappedEl);
                                break;  // We follow mootools here and break as soon as it fits.. jquery keeps going at the cost of performance
                            }
                        }
                    }
                }
            }
        },

        /**
         * Utility function that deletes and unregisters an event if no listeners or proxies are attached.
         *
         * @param {String} The event type
         */
        _clearTypeIfEmpty: function (type) {
            var tmp = this._events[type];

            if (!tmp.count && !tmp.proxiedCount) {
                if (this._manager) {
                    this._manager._unproxyEvent(type);
                } else if (this._listening) {
                    this._detachEvent(type);
                }

                delete this._events[type];
            }
        },

        /**
         * Extracts the event type and selector.
         *
         * @param {String} event   The event
         * @param {Object} [$info] An object to fill with the information (if not passed, one will be created)
         *
         * @return {Object} The event info
         */
        _extractEventInfo: function (event, $info) {
            var pos = event.indexOf(' ');

            if (!$info) {
                $info = {};
            }

            if (pos === -1) {
                $info.type = event;
                $info.selector = null;
            } else {
                $info.type = event.substr(0, pos);
                $info.selector = event.substr(pos + 1);
            }

            return $info;
        },

        /**
         * Removes all event listeners of a given name.
         * If no event is specified, removes all events of all names.
         *
         * This will remove all direct and indirect (delegation) listeners.
         *
         * @param {String} [$event] The event name
         */
        _clearListeners: function ($event) {
            var type,
                selector,
                info,
                temp;

            if (!$event) {
                this._emitter.off();

                if (this._manager) {
                    for (type in this._events) {
                        this._manager._unproxyEvent(type);
                    }

                    this._events = {};
                } else {
                    for (type in this._events) {
                        temp = this._events[type];

                        if (!temp.proxiedCount) {
                            this._detachEvent(type);
                            delete this._events[type];
                        } else {
                            temp.delegated.length = 0;
                            temp.count = 0;
                        }
                    }
                }
            } else {
                if (this._emitter.has($event)) {
                    this._emitter.off($event);

                    info = this._extractEventInfo($event, this._eventInfo);
                    temp = this._events[info.type];

                    if (info.selector) {
                        delete temp.delegated[info.selector];
                        temp.count -= 1;
                    } else {
                        for (selector in temp.delegated) {
                            this._emitter.off(info.type + ' ' + selector);
                        }
                        temp.count = 0;
                        temp.delegated = {};
                    }

                    this._clearTypeIfEmpty(info.type);
                }
            }
        },

        /**
         * Stops and remove listeners, removes all children and cleans other resources.
         *
         * @see DomResponder#destroy
         */
        _onDestroy: function () {
            this.off();
            this.removeChildren();

            if (this._manager) {
                this._unsetManager();
            } else {
                this.unlisten();
            }

            Element.removeData(this._element, this.$static.STORE_KEY);

            this._parent = this._element = this._nativeElement = null;
        },

        /////////////////////////////////////////////////////////////////////////////////////

        $statics: {
            _nonPropagableEvents: {
                focus: true,
                blur: true,
                submit: true,
                select: true,
                change: true,
                reset: true,
                load: false,
                unload: false,
                error: false,
                scroll: false
            },
            _nonPropagableEventsMappings: {
                focusin: 'focus',
                focusout: 'blur'

            }
        }
    }),
        docEl = document.documentElement,
        emitsWrapped = Events.emitsWrappedElement();

    return DomResponder;
});
