function OptimizedController() {
	OptimizedController.superclass.constructor.apply(this);
    Logger.registerSpace(this);

    this.root = null;
    this.currentState = null;
    this.initialized = false;

    this.pathToTheState = [];
}
extend(OptimizedController, CrawlingController);
Decisions.register(OptimizedController, "OptimizedController");


OptimizedController.prototype.initialize = function(initialState) {
	this.root = initialState;
    this.root.marked = false;

	this.currentState = initialState;
	this.initialized = true;
};


OptimizedController.prototype.hasToObserve = function() {
    if (!this.initialized) {
        Logger.error(this, "OptimizedController is not initialized");
        return false;
    }

    return !this.root.marked && this.currentState !== null;
};


OptimizedController.prototype.getPath = function() {
    return this.pathToTheState;
};


OptimizedController.prototype.updateCurrentState = function() {
    return this.currentState;
};


OptimizedController.prototype.newState = function(currentState, newState) {
    this.currentState = newState;
    this.pathToTheState = null;
};


OptimizedController.prototype.newTransition = function(currentState, newState) {
    this.currentState = newState;
    this.pathToTheState = null;
};


OptimizedController.prototype.sameStateRemains = function(currentState) {
	if (this.currentState !== currentState)
		Logger.warning(this, "step: Unexpected state" + currentState.id + this.currentState.id);

	if (this.currentState.isObserved()) {
        var childStateToObserve = this._findNotObservedChild(this.currentState);
        if (childStateToObserve === null) {
            this.currentState.marked = true;
            this.currentState = this.currentState.getParent();
            if (this.currentState !== null)
                this.pathToTheState = this.currentState.pathFromLastStable();
        } else {
            this.pathToTheState = this._pathFromTo(this.currentState, childStateToObserve);
            this.currentState = childStateToObserve;
        }
	} else {
        this.pathToTheState = null;
    }
};


OptimizedController.prototype._findNotObservedChild = function(root) {
    var findFunction = function (node) {
        if (node.marked) {
            return false;
        } else if (!node.isObserved()) {
            return true;
        }
    };
    return root.find(findFunction);
};


OptimizedController.prototype._pathFromTo = function(root, child) {
    var path = [];

    path.push(child);
    var r = child;

    while (r.getParent() && r !== root) {
        r = r.getParent();
        path.push(r);
    }
    path.pop();
    path.push(null);

    return path.reverse();
};

