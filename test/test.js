/*global describe, it, before, beforeEach, after*/

define([
    'expect',
    'src/DomResponder',
    './util/triggerEvent',
    'mout/function/bind',
    'jquery'
],
function (expect, DomResponder, triggerEvent, bind, $) {

    'use strict';

    function getNativeElement(element) {
        if (element.nodeType != null || element === window) {
            return element;
        } else {
            return element.get(0);
        }
    }

    // Setup the html
    var html = '<div id="test-wrapper">' +
                    '<div class="wrapper">' +
                        '<div id="test">' +
                            '<div class="ul-wrapper">' +
                                '<ul>'  +
                                   '<li class="item first">Some text</li>' +
                                   '<li class="item second">Some text</li>' +
                                   '<li class="item third">Some text</li>' +
                                   '<li class="item four">Some text</li>' +
                                '</ul>' +
                            '</div>' +
                            '<div class="form-wrapper">' +
                                '<form action="">' +
                                    '<input name="first_input" class="first-input" type="text" value=""/>' +
                                    '<input name="second_input" class="second-input" type="text" value=""/>' +
                                    '<textarea name="some_textarea"></textarea>' +
                                    '<select>' +
                                        '<option value="first_value">First value</option>' +
                                        '<option value="second_value">First value</option>' +
                                    '</select>' +
                                    '<input type="submit"/>' +
                                '</form>' +
                            '</div>' +
                            '<div class="actions">' +
                                '<div class="button ok"></div>' +
                                '<div class="button cancel"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>',
        overlappingResponder,
        ulResponder,
        rootElement,
        rootResponder,
        listResponder,
        liResponders = [],
        formResponder,
        okButtonResponder,
        cancelButtonResponder,
        x,
        temp,
        stack = [],
        args = [];

    $(document.body).append($(html));

    rootElement = $('#test').get(0);

    $(rootElement).css({
        opacity: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        overflow: 'hidden'
    });

    // Create the responders
    rootResponder = new DomResponder(rootElement);
    overlappingResponder = new DomResponder($('#test-wrapper').get(0));
    ulResponder = new DomResponder($(rootElement).find('.ul-wrapper ul').get(0));
    listResponder = new DomResponder($(rootElement).find('.ul-wrapper').get(0));
    formResponder = new DomResponder($(rootElement).find('.form-wrapper form').get(0));
    okButtonResponder = new DomResponder($(rootElement).find('.actions .ok').get(0));
    cancelButtonResponder = new DomResponder($(rootElement).find('.actions .cancel').get(0));

    temp = $(rootElement).find('.ul-wrapper li').get();
    for (x = 0; x < temp.length; x += 1) {
        liResponders.push(new DomResponder(temp[x]));
    }

    // Setup hierarchy
    for (x = 0; x < liResponders.length; x += 1) {
        listResponder.addChild(liResponders[x]);
    }

    rootResponder.addChild(listResponder);
    rootResponder.addChild(formResponder);
    rootResponder.addChild(okButtonResponder);
    rootResponder.addChild(cancelButtonResponder);

    overlappingResponder.addChild(ulResponder);

    // Actual tests
    describe('DomResponder', function () {
        beforeEach(function () {
            overlappingResponder.off();
            rootResponder.off();
            ulResponder.off();
            listResponder.off();
            rootResponder.unlisten();
            listResponder.unlisten();
            overlappingResponder.unlisten();

            for (x = 0; x < liResponders.length; x += 1) {
                liResponders[x].off();
            }

            stack = [],
            args = [];
        });

        describe('.on()', function () {
            it('should register the listener for the event', function () {
                var someFunc = function () {},
                    otherFunc = function () {};

                rootResponder.on('click', someFunc);
                rootResponder.on('click', otherFunc);

                expect(rootResponder.hasListener('click', someFunc)).to.be.equal(true);
                expect(rootResponder.hasListener('click', otherFunc)).to.be.equal(true);
            });

            it('should not respond to the event unless it is listening', function () {
                var someFunc = function (e, el) {
                    stack.push('some');
                    el = getNativeElement(el);
                    expect(el.nodeType).to.be.ok();
                    expect(el).to.be.equal(rootElement);
                },
                    otherFunc = function () {
                        stack.push('other');
                    },
                    evenOtherFunc = function (e, el) {
                        stack.push('other');
                        el = getNativeElement(el);
                        expect(el.nodeType).to.be.ok();
                        expect(el.tagName.toLowerCase()).to.be.equal('li');
                    };

                rootResponder.on('click', someFunc);
                rootResponder.on('click', otherFunc);
                rootResponder.on('click li', evenOtherFunc);

                triggerEvent(rootElement, 'click');
                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack.length).to.be.equal(0);

                rootResponder.listen();

                triggerEvent(rootElement, 'click');
                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack).to.be.eql(['some', 'other', 'other', 'some', 'other']);
            });

            it('should not respond to the event unless it is has a manager listening', function () {
                var someFunc = function () {
                    stack.push('some');
                },
                    otherFunc = function () {
                        stack.push('other');
                    };

                listResponder.on('click', someFunc);
                listResponder.on('click li', otherFunc);

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack.length).to.be.equal(0);

                rootResponder.listen();

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack).to.be.eql(['other', 'some']);
            });

            it('should call handlers with the correct context', function () {
                var someFunc = function () {
                    stack.push(this);
                },
                    obj = {};

                rootResponder.on('click', someFunc, obj);
                rootResponder.listen();

                triggerEvent(rootElement, 'click');

                expect(stack).to.be.eql([obj]);
            });

            it('should not duplicate the same listener', function () {
                var someFunc = function () {
                    stack.push('some');
                };

                rootResponder.on('click', someFunc);
                rootResponder.on('click', someFunc);

                rootResponder.listen();

                triggerEvent(rootElement, 'click');

                expect(stack).to.be.eql(['some']);
            });

            it('should throw an error on delegation of events that are not supported', function () {
                var unsupported = ['load', 'unload', 'error', 'scroll'],
                    x,
                    addNormal = function (x) {
                        rootResponder.on(unsupported[x], function () {});
                    },
                    addDelegation = function (x) {
                        rootResponder.on(unsupported[x] + ' li', function () {});
                    };

                for (x = 0; x < unsupported.length; x += 1) {
                    expect(bind(addNormal, this, x)).to.not.throwException();
                    expect(bind(addDelegation, this, x)).to.throwException(/can't be delegated/);
                }
            });
        });

        describe('.off(event, fn, $context)', function () {
            it('should remove the specified listener', function () {
                var listener = function () {
                        stack.push('listener');
                    },
                    other = function () {
                        stack.push('other');
                    },
                    context = {};

                rootResponder.on('dummy', listener);
                rootResponder.on('click', listener, context);
                rootResponder.on('click', other);
                listResponder.on('click', listener);

                rootResponder.listen();

                rootResponder.off('click', listener);

                triggerEvent(listResponder.getNativeElement(), 'click');

                rootResponder.off('click', listener, context);

                triggerEvent(listResponder.getNativeElement(), 'click');

                rootResponder.off('click', other);
                listResponder.off('click', listener);

                expect(rootResponder.hasListener('click', listener)).to.be.equal(false);
                expect(rootResponder.hasListener('click', other)).to.be.equal(false);
                expect(listResponder.hasListener('click', listener)).to.be.equal(false);
                expect(rootResponder.hasListener('dummy', listener)).to.be.equal(true);

                triggerEvent(listResponder.getNativeElement(), 'click');

                expect(stack).to.eql(['listener', 'listener', 'other', 'listener', 'other']);
            });
        });

        describe('.off($event)', function () {
            var listener1 = function () {
                stack.push('listener1');
            },
                listener2 = function () {
                    stack.push('listener2');
                },
                listener3 = function () {
                    stack.push('listener3');
                };

            it('should remove all the listeners of a given event', function () {
                rootResponder.on('click', listener1);
                rootResponder.on('click', listener2);
                rootResponder.on('mouseover', listener3);
                listResponder.on('click', listener1);

                expect(rootResponder.hasListener('click')).to.be.equal(true);
                expect(rootResponder.hasListener('mouseover')).to.be.equal(true);
                expect(listResponder.hasListener('click')).to.be.equal(true);

                rootResponder.listen();

                triggerEvent(listResponder.getNativeElement(), 'click');
                triggerEvent(listResponder.getNativeElement(), 'mouseover');

                rootResponder.off('click');
                listResponder.off('click');

                expect(rootResponder.hasListener('click')).to.be.equal(false);
                expect(rootResponder.hasListener('mouseover')).to.be.equal(true);
                expect(listResponder.hasListener('click')).to.be.equal(false);

                triggerEvent(listResponder.getNativeElement(), 'click');
                triggerEvent(listResponder.getNativeElement(), 'mouseover');

                rootResponder.off('mouseover');

                expect(rootResponder.hasListener('mouseover')).to.be.equal(false);

                triggerEvent(listResponder.getNativeElement(), 'mouseover');

                expect(stack).to.eql(['listener1', 'listener1', 'listener2', 'listener3', 'listener3']);
            });

            it('should remove all the listeners (if no event is specified)', function () {
                rootResponder.on('click', listener1);
                rootResponder.on('click', listener2);
                rootResponder.on('mouseover', listener3);
                listResponder.on('click', listener1);

                expect(rootResponder.hasListener('click')).to.be.equal(true);
                expect(rootResponder.hasListener('mouseover')).to.be.equal(true);
                expect(listResponder.hasListener('click')).to.be.equal(true);

                rootResponder.listen();

                triggerEvent(listResponder.getNativeElement(), 'click');
                triggerEvent(listResponder.getNativeElement(), 'mouseover');

                rootResponder.off();
                listResponder.off();

                expect(rootResponder.hasListener('click')).to.be.equal(false);
                expect(rootResponder.hasListener('mouseover')).to.be.equal(false);
                expect(listResponder.hasListener('click')).to.be.equal(false);

                triggerEvent(listResponder.getNativeElement(), 'click');
                triggerEvent(listResponder.getNativeElement(), 'mouseover');

                expect(stack).to.eql(['listener1', 'listener1', 'listener2', 'listener3']);
            });
        });

        describe('.addChild()', function () {
            var someResponder,
                otherResponder;

            before(function () {
                someResponder = new DomResponder(document.body);
                otherResponder = new DomResponder($('#mocha').get(0));
            });

            after(function () {
                someResponder.destroy();
                otherResponder.destroy();
            });

            it('should register the passed responder as its child', function () {

                expect(someResponder.hasChild(otherResponder)).to.be.equal(false);

                someResponder.addChild(otherResponder);

                expect(someResponder.hasChild(otherResponder)).to.be.equal(true);
            });
        });

        describe('.removeChild()', function () {
            var someResponder,
                otherResponder;

            before(function () {
                someResponder = new DomResponder(document.body);
                otherResponder = new DomResponder($('#mocha').get(0));
            });

            after(function () {
                someResponder.destroy();
                otherResponder.destroy();
            });

            it('should unregister the passed responder as its child', function () {
                someResponder.addChild(otherResponder);

                expect(someResponder.hasChild(otherResponder)).to.be.equal(true);

                someResponder.removeChild(otherResponder);

                expect(someResponder.hasChild(otherResponder)).to.be.equal(false);
            });
        });

        describe('.removeChildren()', function () {
            var someResponder,
                otherResponder;

            before(function () {
                someResponder = new DomResponder(document.body);
                otherResponder = new DomResponder($('#mocha').get(0));
            });

            after(function () {
                someResponder.destroy();
                otherResponder.destroy();
            });

            it('should unregister all the children', function () {
                someResponder.addChild(otherResponder);
                someResponder.addChild(rootResponder);

                expect(someResponder.hasChild(otherResponder)).to.be.equal(true);
                expect(someResponder.hasChild(rootResponder)).to.be.equal(true);

                someResponder.removeChildren();

                expect(someResponder.hasChild(otherResponder)).to.be.equal(false);
                expect(someResponder.hasChild(rootResponder)).to.be.equal(false);
            });
        });

        describe('.listen()', function () {
            beforeEach(function () {
                formResponder.off();
            });

            it('should listen to all declared listeners as well as all proxied descendants events', function () {
                var liClick = function () {
                    stack.push('li click');
                },
                    listClick = function () {
                        stack.push('list click');
                    },
                    rootClick = function () {
                        stack.push('root click');
                    },
                    x;

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].on('click', liClick);
                }

                listResponder.on('click', listClick);
                rootResponder.on('click', rootClick);

                expect(rootResponder.isListening()).to.be.equal(false);
                expect(listResponder.isListening()).to.be.equal(false);
                expect(liResponders[0].isListening()).to.be.equal(false);
                expect(listResponder.hasManager()).to.be.equal(false);
                expect(liResponders[0].hasManager()).to.be.equal(false);

                rootResponder.listen();

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(rootResponder.isListening()).to.be.equal(true);
                expect(listResponder.isListening()).to.be.equal(false);
                expect(liResponders[0].isListening()).to.be.equal(false);
                expect(listResponder.hasManager()).to.be.equal(true);
                expect(liResponders[0].hasManager()).to.be.equal(true);

                expect(stack).to.be.eql(['li click', 'list click', 'root click']);
            });

            it('should work well with delegated events', function () {
                var liClick = function () {
                    stack.push('li click');
                },
                    listLiClick = function () {
                        stack.push('list click li');
                    },
                    listClick = function () {
                        stack.push('list click');
                    },
                    rootLiClick = function () {
                        stack.push('root click li');
                    },
                    x;

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].on('click', liClick);
                }

                listResponder.on('click', listClick);
                listResponder.on('click li', listLiClick);
                rootResponder.on('click li', rootLiClick);

                rootResponder.listen();

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack).to.be.eql(['li click', 'list click li', 'list click', 'root click li']);
            });

            it('should work well with events that do not bubble', function () {
                var change = function (e, el) {
                    el = getNativeElement(el);
                    stack.push('change ' + el.nodeName.toLowerCase());
                },
                    select = function () {
                        stack.push('select');
                    },
                    submit = function (e) {
                        stack.push('submit');
                        e.preventDefault();
                    },
                    reset = function () {
                        stack.push('reset');
                    },
                    focus = function (e, el) {
                        el = getNativeElement(el);
                        stack.push('focus ' + el.nodeName.toLowerCase());
                    },
                    blur = function (e, el) {
                        el = getNativeElement(el);
                        stack.push('blur ' + el.nodeName.toLowerCase());
                    },
                    element;

                formResponder.on('change *', change);
                formResponder.on('focus *', focus);
                formResponder.on('blur *', blur);
                rootResponder.on('submit *', submit);
                rootResponder.on('reset *', reset);
                formResponder.on('select *', select);

                rootResponder.listen();

                element = formResponder.getElement().find('input').get(0);
                triggerEvent(element, 'focus');
                element.value = 'some';
                triggerEvent(element, 'change');
                triggerEvent(element, 'blur');

                element = formResponder.getElement().find('textarea').get(0);
                triggerEvent(element, 'focus');
                element.value = 'some';
                triggerEvent(element, 'change');
                triggerEvent(element, 'blur');

                element = formResponder.getElement().find('select').get(0);
                triggerEvent(element, 'focus');
                element.selectedIndex = 1;
                triggerEvent(element, 'change');
                triggerEvent(element, 'blur');

                element = formResponder.getElement().find('input').get(0);
                triggerEvent(element, 'focus');

                element = formResponder.getNativeElement();
                triggerEvent(element, 'submit');
                triggerEvent(element, 'reset');

                element = formResponder.getElement().find('input').get(0);
                triggerEvent(element, 'select');

                // If there is no createEvent, the fireEvent will be used and it messes the delegation test.
                if (!document.createEvent) {
                    throw new Error('Can\'t perform this exact test with simulated events.');
                }

                // It seems that when triggering focus/blur, it actually triggers them two in a row with the jQuery adapter (not in every browser)
                // Sometimes the blur event just fires once
                // But it works nicely with real initiated user events
                expect((function () {

                    if (stack.toString() === [
                        'focus input', 'focus input', 'change input', 'blur input', 'blur input',
                        'focus textarea', 'focus textarea', 'change textarea', 'blur textarea', 'blur textarea',
                        'focus select', 'focus select', 'change select', 'blur select', 'blur select', 'focus input', 'focus input',
                        'submit', 'reset', 'select'
                    ].toString()) {
                        return true;
                    }

                    if (stack.toString() === [
                        'focus input', 'focus input', 'change input', 'blur input',
                        'focus textarea', 'focus textarea', 'change textarea', 'blur textarea',
                        'focus select', 'focus select', 'change select', 'blur select', 'focus input', 'focus input',
                        'submit', 'reset', 'select'
                    ].toString()) {
                        return true;
                    }

                    if (stack.toString() === [
                        'focus input', 'change input', 'blur input',
                        'focus textarea', 'change textarea', 'blur textarea',
                        'focus select', 'change select', 'blur select', 'focus input',
                        'submit', 'reset', 'select'
                    ].toString()) {
                        return true;
                    }

                    return false;
                }())).to.be.equal(true);
            });
        });

        describe('.unlisten()', function () {
            it('should unlisten to all registered events as well as all proxied descendants events', function () {
                var liClick = function () {
                    stack.push('li click');
                },
                    listClick = function () {
                        stack.push('list click');
                    },
                    listLiClick = function () {
                        stack.push('list click li');
                    },
                    rootClick = function () {
                        stack.push('root click');
                    },
                    x;

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].on('click', liClick);
                }

                listResponder.on('click', listClick);
                listResponder.on('click li', listLiClick);
                rootResponder.on('click', rootClick);

                rootResponder.listen();

                expect(rootResponder.isListening()).to.be.equal(true);
                expect(listResponder.isListening()).to.be.equal(false);
                expect(liResponders[0].isListening()).to.be.equal(false);
                expect(listResponder.hasManager()).to.be.equal(true);
                expect(liResponders[0].hasManager()).to.be.equal(true);

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                rootResponder.unlisten();

                expect(rootResponder.isListening()).to.be.equal(false);
                expect(listResponder.isListening()).to.be.equal(false);
                expect(liResponders[0].isListening()).to.be.equal(false);
                expect(listResponder.hasManager()).to.be.equal(false);
                expect(liResponders[0].hasManager()).to.be.equal(false);

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack).to.be.eql(['li click', 'list click li', 'list click', 'root click']);
            });
        });

        describe('.stopPropagation()', function () {
            it('should not call listeners up in the hierarchy', function () {
                var liClick = function (e) {
                    stack.push('li click');
                    e.stopPropagation();
                },
                    liClick2 = function () {
                        stack.push('li click 2');
                    },
                    listClick = function () {
                        stack.push('list click');
                    },
                    listLiClick = function (e) {
                        stack.push('list click li');
                        e.stopPropagation();
                    },
                    rootClick = function () {
                        stack.push('root click');
                    },
                    x;

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].on('click', liClick);
                    liResponders[x].on('click', liClick2);
                }

                listResponder.on('click', listClick);
                listResponder.on('click li', listLiClick);
                rootResponder.on('click', rootClick);

                rootResponder.listen();

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].off('click', liClick);
                }

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack).to.be.eql(['li click', 'li click 2', 'li click 2', 'list click li', 'list click']);
            });
        });

        describe('.destroy()', function () {
            it('should destroy the instance, stop listening, remove listeners and children', function () {
                var liClick = function () {
                    stack.push('li click');
                },
                    listClick = function () {
                        stack.push('list click');
                    },
                    listLiClick = function () {
                        stack.push('list click li');
                    },
                    rootClick = function () {
                        stack.push('root click');
                    },
                    x;

                for (x = 0; x < liResponders.length; x += 1) {
                    liResponders[x].on('click', liClick);
                }

                listResponder.on('click', listClick);
                listResponder.on('click li', listLiClick);
                rootResponder.on('click', rootClick);

                rootResponder.listen();

                rootResponder.destroy();

                expect(rootResponder.hasChild(formResponder)).to.be.equal(false);
                expect(rootResponder.isListening()).to.be.equal(false);
                expect(listResponder.isListening()).to.be.equal(false);
                expect(liResponders[0].isListening()).to.be.equal(false);
                expect(listResponder.hasManager()).to.be.equal(false);
                expect(liResponders[0].hasManager()).to.be.equal(false);

                triggerEvent(liResponders[0].getNativeElement(), 'click');

                expect(stack.length).to.be.equal(0);
            });
        });

        it('it should throw an error if a new one is constructed over an element', function () {
            var element = $(rootElement).find('.actions').get(0),
                responder = new DomResponder(element);

            responder.listen();

            expect(responder.isListening()).to.be.equal(true);

            expect(function () {
                return new DomResponder(element);
            }).to.throwException(/already associated/);
        });

        it('should work even if different responders overlap each other', function () {
            var liClick = function () {
                stack.push('li click');
            },
                listLiClick = function () {
                    stack.push('list click li');
                },
                listClick = function () {
                    stack.push('list click');
                },
                rootLiClick = function () {
                    stack.push('root click li');
                },
                ulLiClick = function () {
                    stack.push('ul click li');
                },
                ulClick = function () {
                    stack.push('ul click');
                },
                x;

            for (x = 0; x < liResponders.length; x += 1) {
                liResponders[x].on('click', liClick);
            }

            listResponder.on('click', listClick);
            listResponder.on('click li', listLiClick);
            rootResponder.on('click li', rootLiClick);
            overlappingResponder.on('click', listClick);
            overlappingResponder.on('click li', listLiClick);
            ulResponder.on('click', ulClick);
            ulResponder.on('click li', ulLiClick);

            rootResponder.listen();
            overlappingResponder.listen();

            triggerEvent(liResponders[0].getNativeElement(), 'click');

            expect(stack).to.be.eql(['li click', 'list click li', 'list click', 'root click li', 'ul click li', 'ul click', 'list click li', 'list click']);
        });
    });
});
