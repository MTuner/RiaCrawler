// EventUtils "class" is designed to collect and trigger events on the page
// !! Must be injected in page context !!
//
// hookAddEventListener() is called on every page
// Use
// checkSimpleEventHandlers() to collect all events on the page;
//

// Using module pattern to provide some encapsulation
var EventUtils = (function () {

    var userEventHandlers = {};
    var timeouts = [];

    var originalSetTimeout;
    var originalSetInterval;

    var setTimeoutHooksEnabled;
    var setTimeoutHookThreshold;
    var setIntervalHookThreshold;

    var registerEventHandler = function (element, event) {
        var selector = EventUtils.getQuerySelector(element);
        if (typeof userEventHandlers[selector] === "undefined") {
            userEventHandlers[selector] = {};
            userEventHandlers[selector].events = {};
            userEventHandlers[selector].metadata = EventUtils.collectMetadata(element);
        }
        userEventHandlers[selector].events[event] = true;
    };

    var qs = function (selector) {
      var elem = document.getElementsByTagName("html")[0];
      var paths = selector.split(">");
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i].trim();
        if (path === "HTML")
            continue;
        else if (path.indexOf("#") === 0) {
           elem = document.getElementById(path.substring(1));
           continue;
       }
       else {
           var childIndexStart = path.indexOf("(");
               var childIndexEnd = path.indexOf(")");
               var index = parseInt(path.substring(childIndexStart+1, childIndexEnd)) - 1;
               elem = elem.children[index];
           }
       }
       return elem;
    };

    return {
        setPageParams: function(params) {
            if (params) {
                setTimeoutHooksEnabled = params["setTimeoutHooksEnabled"];
                setTimeoutHookThreshold = params["setTimeoutHookThreshold"];
                setIntervalHookThreshold = params["setIntervalHookThreshold"];
            }
        },

        // addEventListener hooking function (must be called on every page initialization)
        hookAddEventListener: function() {
            Node.prototype.realAddEventListener = Node.prototype.addEventListener;
            Node.prototype.addEventListener = function(event, handler, useCapture) {
                this.realAddEventListener(event, handler, useCapture);

                if (!this.lastListenerInfo) {
                    this.lastListenerInfo = []
                }
                this.lastListenerInfo.push({event: event, handler : handler});
            };
        },

        // removeEventListener hooking function (must be called on every page initialization)
        hookRemoveEventListener: function() {
            Node.prototype.realRemoveEventListener = Node.prototype.removeEventListener;
            Node.prototype.removeEventListener = function(event, handler, useCapture) {
                this.realRemoveEventListener(event, handler, useCapture);

                if (!this.lastListenerInfo)
                    return;

                for (var i = 0; i < this.lastListenerInfo.length; ++i) {
                    if (this.lastListenerInfo[i].event === event && this.lastListenerInfo[i].handler === handler)
                        this.lastListenerInfo.splice(i, 1);
                }
            };
        },


        hookTimeOuts: function() {
            if (!setTimeoutHooksEnabled) {
                return;
            }

            originalSetTimeout = setTimeout;
            originalSetInterval = setInterval;

            setTimeout = function() {
                var time = arguments[1];

                if (setTimeoutHookThreshold < time) {
                    var timeout = {"type": "TIMEOUT", "context": this, "arguments": arguments};
                    timeouts.push(timeout)
                } else {
                    originalSetTimeout.apply(this, arguments);
                }
            };

            setInterval = function() {
                var time = arguments[1];
                if (setTimeoutHookThreshold < time) {
                    var timeout = {"type": "INTERVAL", "context": this, "arguments": arguments};
                    timeouts.push(timeout)
                } else {
                    originalSetInterval.apply(this, arguments);
                }
            }
        },

        getTimeoutHandlers: function() {
            return timeouts;
        },

        triggerTimeoutEvent: function(selector, arguments) {
            var timeout = timeouts[selector];
            timeout.arguments[1] = 0;
            originalSetTimeout.apply(timeout.context, timeout.arguments);
        },

        // return the list of {selector, event} pairs
        getUserEventHandlers: function() {
            EventUtils.checkUserEventHandlers();
            var handlersArray = [];
            for (var selector in userEventHandlers) {
                for (var event in userEventHandlers[selector].events) {
                    handlersArray.push({selector: selector, event: event, metadata: userEventHandlers[selector].metadata })
                }
            }

            return handlersArray;
        },

        // trigger "eventType" event on element "selector"
        triggerUserEvent: function(selector, eventType) {
            var element = qs(selector);

            if (element.tagName.toLowerCase() === "form" && eventType === "submit"
                && typeof element.submit === "function")
            {
                element.submit();
                return;
            }

            if (element.fireEvent) {
                (element.fireEvent('on' + eventType));
            } else {
                var eventObject = document.createEvent('Events');
                eventObject.initEvent(eventType, true, false);
                element.dispatchEvent(eventObject);
            }
        },

        // reset event handlers date
        resetEventHandlers: function() {
            userEventHandlers = {}
        },

        // collect all elements which have event handlers
        checkUserEventHandlers: function() {
            var elems = document.getElementsByTagName("*");

            var allEvents = ["click", "dblclick", "focus", "focusin", "focusout", "keydown", "keypress",
                             "keyup", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout",
                             "mouseover", "mouseup", "mousewheel", "resize", "scroll", "select", "submit",
                             "textinput", "wheel"];

            for (var i = 0, max = elems.length; i < max; i++) {
                var currentElem = elems[i];
                var currentElemEvents = {}; // we're using this array when collect jquery delegates.

                // check "simple" event handlers
                for (var j = 0; j < allEvents.length; j++) {
                    if (currentElem["on" + allEvents[j]] !== null && typeof currentElem["on" + allEvents[j]] !== "undefined") {
                        registerEventHandler(currentElem, allEvents[j]);
                        currentElemEvents[allEvents[j]] = true;
                        // handler code: elems[i]["on" + allEvents[j]]
                    }
                }

                // add "click" event on the all <a> elements
                if (currentElem.tagName.toLowerCase() == "a") {
                    registerEventHandler(currentElem, "click");
                    currentElemEvents["click"] = true;
                }

                // add "submit" event on the all forms
                if (currentElem.tagName.toLowerCase() == "form") {
                   registerEventHandler(currentElem, "submit");
                    currentElemEvents["submit"] = true;
                }

                // check dynamic event handlers (addEventListener)
                var dynamicHandlers = currentElem.lastListenerInfo;
                if (typeof dynamicHandlers !== "undefined") {
                    for (var j = 0; j < dynamicHandlers.length; ++j) {
                        // handler code: dynamicHandlers[j].handler
                        registerEventHandler(currentElem, dynamicHandlers[j].event);
                        currentElemEvents[dynamicHandlers[j].event] = true;
                    }
                }

                // Check jQuery delegate events. If any event is set using jQuery, it's already in handlers array.
                // So, check only necessary types of events
                if (window.jQuery && typeof $ !== "undefined") {
                    var jQueryVersion = $().jquery;
                    if (jQueryVersion >= "1.7") {
                        if (typeof $.data($(currentElem).get(0), ("events")) !== "undefined") {
                            for (var ev in currentElemEvents) {
                                var eventObjects = $._data($(currentElem).get(0), "events")[ev];
                                if (typeof eventObjects !== "undefined") {
                                    for (var j = 0; j < eventObjects.length; ++j) {
                                        if (typeof eventObjects[j].selector !== "undefined") {
                                            var delegates = $(eventObjects[j].selector).get();
                                            for (var k = 0; k < delegates.length; ++k) {
                                                registerEventHandler(delegates[k], ev); // handler code: eventObjects[j].handler
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else {
                        console.log("Unsupported jQuery version: " + $().jquery);
                    }
                }
            }
        },

        // returns CSS3-selector of some DOM element
        getQuerySelector: function (el) {
            var names = [];
            while (el.parentNode) {
                if (el.id) {
                    names.unshift('#' + el.id);
                    break;
                } else {
                    if (el == el.ownerDocument.documentElement) {
                        names.unshift(el.tagName);
                    } else {
                        //noinspection StatementWithEmptyBodyJS
                        for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
                        names.unshift(el.tagName + ":nth-child(" + c + ")");
                    }

                    el = el.parentNode;
                }
            }
            return names.join(" > ");
        }
    };
})();

EventUtils.collectMetadata = function(element) { return {} };
EventUtils.collectMetadataDefined = false;

// hooks on every page
EventUtils.hookAddEventListener();
EventUtils.hookRemoveEventListener();
EventUtils.hookTimeOuts();