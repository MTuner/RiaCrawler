// Simple StateComparator, compare URLS of the states, nothing else.
function UrlStateComparator() {
    UrlStateComparator.superclass.constructor.apply(this);
}
extend(UrlStateComparator, StateComparator);

UrlStateComparator.prototype.computeCurrentStateData = function (casper) {
    return casper.getCurrentUrl();
};

UrlStateComparator.prototype.computeAndSetStateData = function(casper, state) {
	state.data = casper.getCurrentUrl();
};

UrlStateComparator.prototype.compareStateData = function(casper, first, second) {
    // UNUSED: casper
    return (first === second);
};


Decisions.register(UrlStateComparator, "UrlStateComparator");