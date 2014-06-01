function EventHandler(type, selector, event) {
    this._key = selector;
    this._type = type;
    this._event = event;
}

EventHandler.Type = { USER_EVENT: 1, TIMEOUT: 2, WINDOW_OPEN: 3 };


EventHandler.prototype.key = function() {
    return this._key
};


EventHandler.prototype.type = function() {
    return this._type
};


EventHandler.prototype.event = function() {
    return this._event
};


EventHandler.prototype.trigger = function() {
    Logger.trace("EventHandler", this._key + ": " + this._event);

    if (this._type === EventHandler.Type.USER_EVENT) {
        casper.evaluate(function(selector, event) {
            EventUtils.triggerUserEvent(selector, event)
        }, this._key, this._event);
    }
    else if (this._type === EventHandler.Type.TIMEOUT) {
        casper.evaluate(function(selector, event) {
            EventUtils.triggerTimeoutEvent(selector, event)
        }, this._key, this._event);
    }
    else if (this._type === EventHandler.Type.WINDOW_OPEN) {
        // TODO: Not implemented yet
        Logger.warning(this, "NOT IMPLEMENTED YET")
    }
};
