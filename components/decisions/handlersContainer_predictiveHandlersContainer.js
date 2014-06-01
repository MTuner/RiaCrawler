function PredictiveHandlersContainer() {
    PredictiveHandlersContainer.superclass.constructor.apply(this);
	this._handlers = [];
	this._observed = [];

    this._groups = {};
    this._maximumPriorityHandler = null;
    Logger.registerSpace(this);
}
extend(PredictiveHandlersContainer, HandlersContainer);
Decisions.register(PredictiveHandlersContainer, "PredictiveHandlersContainer");

PredictiveHandlersContainer.weights = Settings.get("PredictiveHandlersContainer.weights", [0, 1, 1, 1, 1, 1]);
PredictiveHandlersContainer.learningResult = PredictiveHandlersContainer.learningResult || 0;


PredictiveHandlersContainer.prototype.construct = function (handlerList) {
    this._handlers = handlerList;
    this._observed = [];
    this._lastObserved = null;
};


PredictiveHandlersContainer.prototype.observeOne = function () {
    var handlers = this._handlers;
    var handler = null;

    if (Settings.get("PredictiveHandlersContainer.learning", false)) {
        var index = Math.floor((Math.random() * (handlers.length - 1)) + 0);

        handler = handlers[index];
        this._handlers.splice(this._handlers.indexOf(handler), 1);
    }
    else {
        var handler = this._maximumPriorityHandler;
        if (handler === null) {
            Logger.warning(this, "Unspecified maximum priority handler");
            handler = handlers[0];
        }

        this._handlers.splice(this._handlers.indexOf(handler), 1);
    }

    if (handler.global !== null) {
        GlobalHandlersContainer.handlers[handler.global] = true;
    }

    this._observed.push(handler);
    this._lastObserved = handler;
    handler.observed = true;
    handler.moveToNewState = false;
    handler.trigger();
};


PredictiveHandlersContainer.prototype.observeFinished = function(newState) {
    var handler = this._lastObserved;
    if (newState) {
        handler.moveToNewState = true;
        if (Settings.get("PredictiveHandlersContainer.learning", false)) {
            if (handler === this._maximumPriorityHandler)
                PredictiveHandlersContainer.learningResult++;
            Logger.warning(this, "Current learning result: " + PredictiveHandlersContainer.learningResult);
        }
    }

    this._lastObserved = null;
};


PredictiveHandlersContainer.prototype.hasNotObserved = function () {
    return this._handlers.length > 0;
};


PredictiveHandlersContainer.prototype.updateHandlers = function () {
    casper.evaluate(function() { EventUtils.resetEventHandlers(); });
    this._hookMetadata();
    this._updateHandlers();
    this._calculatePriority();
};


PredictiveHandlersContainer.prototype._updateHandlers = function() {
    var updatedHandlers = casper.evaluate(function () {
        return EventUtils.getUserEventHandlers();
    });

    var currentHandlers = this._handlers.concat(this._observed);
    for (var i = 0; i < updatedHandlers.length; i++) {
        var contains = false;
        for (var j = 0; j < currentHandlers.length; j++) {
            if (currentHandlers[j].type() === EventHandler.Type.USER_EVENT
                && currentHandlers[j].key() === updatedHandlers[i].selector
                && currentHandlers[j].event() === updatedHandlers[i].event) {
                contains = true;
                break;
            }
        }
        if (contains === false) {
            var handler = new PredictiveEventHandler(EventHandler.Type.USER_EVENT, updatedHandlers[i].selector,
                                                     updatedHandlers[i].event, updatedHandlers[i].metadata);
            this._handlers.push(handler)
        }
    }
};


PredictiveHandlersContainer.prototype._hookMetadata = function () {
    casper.evaluate(function() {
        if (!EventUtils.collectMetadataDefined) {
            EventUtils.collectMetadata = function(element) {
                var getIdSelector = function (el) {
                    var names = [];
                    var checkOrder = !el.id && !el.name;
                    while (el.parentNode) {
                        if (el.id) {
                            names.unshift('#' + el.id);
                        } else if (el.name) {
                            names.unshift('#' + el.name);
                        } else {
                            if (el == el.ownerDocument.documentElement || !checkOrder) {
                                names.unshift(el.tagName);
                            } else {
                                var cn = [], c = 1, e = el;
                                do {
                                    cn.unshift(e.tagName);
                                    e = e.previousElementSibling;
                                    c++;
                                } while (e !== null);

                                names.unshift(el.tagName + "[" + cn.join(";") + "]" + ":nth-child(" + c + ")");
                            }
                        }
                        el = el.parentNode;
                    }
                    return names.join(">").toLowerCase();
                };

                var getGroupSelector = function(el) {
                    var names = [], ch = [];
                    var children = el.children;
                    for (var i = 0; i < children.length; ++i) {
                        ch.unshift(children[i].tagName)
                    }
                    while (el.parentNode) {
                        names.unshift(el.tagName);
                        el = el.parentNode;
                    }
                    return names.join(">").toLowerCase() + "<" + ch.join(";").toLowerCase();
                };

                var metadata = {};
                var el = element;
                metadata.idSelector = getIdSelector(el);
                metadata.groupSelector = getGroupSelector(el);
                return metadata;
            };
            EventUtils.collectMetadataDefined = true;
        }
    });
};


PredictiveHandlersContainer.prototype._calculatePriority = function() {
    this._clearGroupData();
    for (var i = 0; i < this._handlers.length; ++i) {
        var handler = this._handlers[i];
        this._initHandlerGroup(handler);
        this._initHandlerGlobal(handler);
    }
    for (var i = 0; i < this._observed.length; ++i) {
        var handler = this._observed[i];
        this._initHandlerGroup(handler);
        this._initHandlerGlobal(handler);
    }

    this._maximumPriorityHandler = -1;
    var maximumPriority = -1;

    var w = PredictiveHandlersContainer.weights;
    for (var i = 0; i < this._handlers.length; ++i) {
        var handler = this._handlers[i];

        var fx = w[0];
        if (handler.global && handler.global !== null && !GlobalHandlersContainer.handlers[handler.global]) {
            fx += w[1] * 1;
        }
        if (handler.group && handler.group.length === 1) {
            fx += w[2] * 1;
        }

        if (handler.group && handler.group !== null && handler.group.length > 0) {
            for (var j = 0; j < handler.group.length; ++j) {
                var neighbour = handler.group[j];
                if (neighbour !== handler) {
                    if (neighbour.observed && neighbour.moveToNewState) {
                        fx += w[3] * 1;
                    } else if (neighbour.observed && !neighbour.moveToNewState) {
                        fx += w[4] * 1;
                    } else if (neighbour.global !== null && !GlobalHandlersContainer.handlers[neighbour.global]) {
                        fx += w[5] * 1;
                    }
                }
            }
        }

        if (fx > maximumPriority) {
            maximumPriority = fx;
            this._maximumPriorityHandler = handler;
        }
    }
};


PredictiveHandlersContainer.prototype._clearGroupData = function() {
    this._groups = {};
};


PredictiveHandlersContainer.prototype._initHandlerGroup = function(handler) {
    var metadata = handler.metadata || {};
    var groupMetadata = metadata.groupSelector;
    var event = handler.event();

    if (typeof groupMetadata !== "undefined") {
        var key = groupMetadata + event;
        this._groups[key] = this._groups[key] || [];
        this._groups[key].push(handler);
        handler.group = this._groups[key];
    }
};


PredictiveHandlersContainer.prototype._initHandlerGlobal = function(handler) {

    var metadata = handler.metadata || {};
    var groupMetadata = metadata.idSelector;
    var event = handler.event();
    var key = groupMetadata + event;

    // new global handler
    if (typeof GlobalHandlersContainer.handlers[key] === "undefined") {
        GlobalHandlersContainer.handlers[key] = false;
    }
    handler.global = key;
};


function PredictiveEventHandler(type, selector, event, metadata) {
    PredictiveEventHandler.superclass.constructor.apply(this, [type, selector, event]);
    this.group = null;
    this.global = null;

    this.observed = false;
    this.moveToNewState = false;

    this.metadata = metadata;
}
extend(PredictiveEventHandler, EventHandler);



function GlobalHandlersContainer() {}
GlobalHandlersContainer.handlers = GlobalHandlersContainer.handlers || {};


// TODO: apply this method, it's much more heuristic!
//                var getGroupSelector = function (el) {
//                    var names = [];
//
//                    while (el.parentNode) {
//
//                        if (el == el.ownerDocument.documentElement) {
//                            names.unshift(el.tagName);
//                        } else {
//                            var c = 1, e = el;
//                            do {
//                                e = e.previousElementSibling; c++
//                            } while (e !== null);
//
//                            names.unshift(el.tagName + ":nth-child(" + c + ")");
//                        }
//                        el = el.parentNode;
//                    }
//                    return names.join(">").toLowerCase();
//                };