// StateComparator generic class.
// Subclasses must implement following methods:
// - computeCurrentStateData(casper)
// - computeAndSetStateData(casper, state)
// - compareStateData(first, second)

function StateComparator() {}

StateComparator.prototype.computeCurrentStateData = function (casper) {
    return {}
};


StateComparator.prototype.computeAndSetStateData = function (casper, state) {
    state.data = {}
};


StateComparator.prototype.compareStateData = function (casper, firstData, secondData) {
    return false;
};


StateComparator.prototype.isNewState = function (oldState, casper) {
    return !(this.compareStateData(oldState.data, this.computeCurrentStateData()))
};


StateComparator.prototype.compareStates = function (casper, first, second) {
    return this.compareStateData(casper, first.data, second.data)
};
