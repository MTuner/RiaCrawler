function BreadthFirstController() {
	BreadthFirstController.superclass.constructor.apply(this);
    Logger.registerSpace(this);

    this.bfsQueue = [];
    this.currentState = null;
    this.initialized = false;
}
extend(BreadthFirstController, CrawlingController);
Decisions.register(BreadthFirstController, "BreadthFirstController");


BreadthFirstController.prototype.initialize = function(initialState) {
	this.bfsQueue.push(initialState);
	this.initialized = true;
};


BreadthFirstController.prototype.hasToObserve = function() {
	if (!this.initialized) {
		Logger.error(this, "BreadthFirstController is not initialized");
		return false;
	}
	return this.bfsQueue.length > 0 || (this.currentState !== null && !this.currentState.isObserved());
};


BreadthFirstController.prototype.getPath = function() {
	if (this.currentState === null) {
		this.currentState = this.bfsQueue.shift();
	}

	return this.currentState.pathFromLastStable()
};


BreadthFirstController.prototype.newState = function(currentState, newState) {
	this.step(currentState);
};


BreadthFirstController.prototype.newTransition = function(currentState, newState) {
	this.step(currentState);
};


BreadthFirstController.prototype.sameStateRemains = function(currentState) {
	this.step(currentState);
};


BreadthFirstController.prototype.step = function(currentState) {
	if (this.currentState !== currentState)
		Logger.warning(this, "Unexpected state");

	if (this.currentState.isObserved()) {
		var childrenStates = this.currentState.getChildren();
		for (var i = 0; i < childrenStates.length; i++) {
			this.bfsQueue.push(childrenStates[i]);
		}
		this.currentState = null;
	}
};