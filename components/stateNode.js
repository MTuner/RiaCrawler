// extends TreeNode
function StateNode(data, id) {
    StateNode.superclass.constructor.call(this);

    this.id = id || StateNode.generateId();

    // content of the state (filled by CompareStateDecision)
    this.data = data;

    // all the handlers are observed or not
    this.observed = false;

    // transitions to another states
    this.transitions = {};

    // event handlers container
    this.handlersContainer = Decisions.create("HandlersContainer");
}
extend(StateNode, TreeNode);

// Unique ID generator
StateNode.idCounter = 0;
StateNode.generateId = function () {
    return StateNode.idCounter++;
};

StateNode.prototype.initHandlers = function () {
    this.handlersContainer.init();
};


StateNode.prototype.updateHandlers = function () {
    this.handlersContainer.updateHandlers();
};


StateNode.prototype.newTransition = function(stateId, newState) {
    if (typeof this.transitions[stateId] === "undefined")
        this.transitions[stateId] = [];

    this.transitions[stateId].push(this.handlersContainer.lastObserved());
};


StateNode.prototype.newChildState = function newChildState(state) {
    this.addChild(state);
    state.setParent(this);
    this.newTransition(state.id, true);
};


StateNode.prototype.isObserved = function () {
    return !(this.handlersContainer.hasNotObserved());
};


// Observe one of the handlers (not observed yet)
StateNode.prototype.observeOneHandler = function () {
    var handler = this.handlersContainer.observeOne();

    if (this.handlersContainer.hasNotObserved() == false)
        this.observed = true;

    return handler;
};


StateNode.prototype.observeFinished = function(toTheNewState) {
    this.handlersContainer.observeFinished(toTheNewState);
};


StateNode.prototype.childWithId = function (id) {
    var found = null;
    this.forEachChild(function (node) {
        if (node.id === id)
            found = node;
    });
    return found;
};


StateNode.prototype.find = function (f, opt_this) {
    var found = null;

    this.traverse(function (node) {
        if (found !== null)
            return false;

        if (f.call(opt_this, node) === true) {
            found = node;
            return false;
        }

        return true;
    }, this);

    return found;
};


StateNode.prototype.pathFromRoot = function () {
    var path = [];

    path.push(this);
    var root = this;

    while (root.getParent()) {
        root = root.getParent();
        path.push(root)
    }

    return path.reverse();
};


StateNode.prototype.pathFromRootId = function () {
    var path = [];

    path.push(this.id);
    var root = this;

    while (root.getParent()) {
        root = root.getParent();
        path.push(root.id)
    }

    return path.reverse();
};
