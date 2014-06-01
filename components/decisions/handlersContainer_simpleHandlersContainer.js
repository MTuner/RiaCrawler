function SimpleHandlersContainer() {
    SimpleHandlersContainer.superclass.constructor.apply(this);

	this._handlers = [];
	this._observed = [];
}
extend(SimpleHandlersContainer, HandlersContainer);
Decisions.register(SimpleHandlersContainer, "SimpleHandlersContainer");


SimpleHandlersContainer.prototype.construct = function (handlerList) {
    this._handlers = handlerList;
    this._observed = [];
    this._lastObserved = null;
};


SimpleHandlersContainer.prototype.observeOne = function () {
    var handlers = this._handlers;
    var handler = handlers.pop();
    this._observed.push(handler);

    this._lastObserved = handler;
    handler.trigger();
};


SimpleHandlersContainer.prototype.hasNotObserved = function () {
    return this._handlers.length > 0;
};


SimpleHandlersContainer.prototype.updateHandlers = function () {
    casper.evaluate(function() { EventUtils.resetEventHandlers(); })

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
            var handler = new EventHandler(EventHandler.Type.USER_EVENT, updatedHandlers[i].selector, updatedHandlers[i].event)
            this._handlers.push(handler)
        }
    }

    var timeouts = casper.evaluate(function() { return EventUtils.getTimeoutHandlers(); });
    for (var i = 0; i < timeouts.length; i++) {
        var contains = false;
        for (var j = 0; j < currentHandlers.length; j++) {
            if (currentHandlers[j].type() === EventHandler.Type.TIMEOUT
                && currentHandlers[j].key() === i)
            {
                contains = true;
                break;
            }
        }
        if (contains === false) {
            var handler = new EventHandler(EventHandler.Type.TIMEOUT, i, timeouts[i].arguments);
            this._handlers.push(handler)
        }
    }
};
