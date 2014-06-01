function DepthFirstController() {
	DepthFirstController.superclass.constructor.apply(this);
    Logger.registerSpace(this);

    this.dfsStack = [];
    this.currentState = null;
    this.initialized = false;
}
extend(DepthFirstController, CrawlingController);
Decisions.register(DepthFirstController, "DepthFirstController");


DepthFirstController.prototype.initialize = function(initialState) {
	this.dfsStack.push(initialState);
	this.currentState = this.topState();
	this.initialized = true;
};


DepthFirstController.prototype.hasToObserve = function() {
	if (!this.initialized) {
		Logger.error(this, "DepthFirstController is not initialized");
		return false;
	}

	return this.dfsStack.length > 0;
};


DepthFirstController.prototype.getPath = function() {
	if (this.currentState === this.topState()) {
		return null;
	}
	else {
		this.currentState = this.topState();
		return this.topState().pathFromLastStable()
	}
};


DepthFirstController.prototype.newState = function(currentState, newState) {
	this.dfsStack.push(newState);
	this.currentState = newState;
};


DepthFirstController.prototype.newTransition = function(currentState, newState) {
	this.step(currentState);
	this.currentState = null;
};


DepthFirstController.prototype.sameStateRemains = function(currentState) {
	this.step(currentState);
};


DepthFirstController.prototype.step = function(currentState) {
	if (this.currentState !== currentState)
		Logger.warning(this, "step: Unexpected state" + currentState.id + this.currentState.id);

	if (this.currentState.isObserved()) {
		this.dfsStack.pop();
		this.currentState = null;
	}
};


DepthFirstController.prototype.topState = function () {
    if (this.dfsStack.length > 0)
        return this.dfsStack[this.dfsStack.length - 1];
    return null;
};
