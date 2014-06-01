// HandlersContainer: manage and fire handler events on the page of the state.
// Implement construct(), observeOne() and hasNotObserved() in subclasses.

function HandlersContainer() {
    this._lastObserved = null;
}

HandlersContainer.prototype.construct = function (handlerList) {
    throw new Error("Abstract method!");
};
HandlersContainer.prototype.observeOne = function () {
    throw new Error("Abstract method!");
};
HandlersContainer.prototype.lastObserved = function() {
    return this._lastObserved;
};

HandlersContainer.prototype.observeFinished = function(newState){
};

HandlersContainer.prototype.hasNotObserved = function () {
    throw new Error("Abstract method!");
};
HandlersContainer.prototype.updateHandlers = function () {
    throw new Error("Abstract method!");
};
