// CrawlingController generic class.
// Subclasses must implement following methods:

function CrawlingController() {}


CrawlingController.prototype._wrongClass = function() {
	Logger.fatal("CrawlingController", "Invalid base class call");
};

CrawlingController.prototype.initialize = function(state) {
	this._wrongClass()
};


CrawlingController.prototype.hasToObserve = function() {
	this._wrongClass();
	return false;
};


CrawlingController.prototype.getPath = function () {
	this._wrongClass();
    return null;
};


CrawlingController.prototype.updateCurrentState = function() {
    return null;
};


CrawlingController.prototype.newState = function(currentState, newState) {
	this._wrongClass()
};


CrawlingController.prototype.newTransition = function(currentState, newState) {
	this._wrongClass()
};


CrawlingController.prototype.sameStateRemains = function(currentState) {
	this._wrongClass()
};
