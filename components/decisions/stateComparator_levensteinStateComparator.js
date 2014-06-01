function LevensteinStateComparator() {
    LevensteinStateComparator.superclass.constructor.apply(this);
}
extend(LevensteinStateComparator, StateComparator);


LevensteinStateComparator.getDocumentHtml = function () {
    return document.getElementsByTagName("body")[0].innerHTML;
};


LevensteinStateComparator.prototype.computeCurrentStateData = function (casper) {
    return casper.evaluate(LevensteinStateComparator.getDocumentHtml).replace(/ /g, "");
};


LevensteinStateComparator.prototype.computeAndSetStateData = function (casper, state) {
    state.data = casper.evaluate(LevensteinStateComparator.getDocumentHtml).replace(/ /g, "");
};


LevensteinStateComparator.prototype.compareStateData = function (casper, first, second) {
    return LevensteinStateComparator._isEqual(first, second);
};


LevensteinStateComparator._isEqual = function (first, second) {
    var s1 = first + " ";
    var s2 = second + " ";
    var distance = LevensteinStateComparator._computeDistance(s1, s2);
    var avglen = (s1.length + s2.length) / 2;
    return (distance / avglen) < 0.00001;
};


LevensteinStateComparator._computeDistance = function (first, second) {
    var n = first.length;
    var m = second.length;

    if (n == 0) {
        return m;
    } else if (m == 0) {
        return n;
    }

    if (n > m) {
        var tmp = first;
        first = second;
        second = tmp;
        n = m;
        m = second.length;
    }

    var p = new Array(n + 1);
    var d = new Array(n + 1);
    var _d;

    var i;
    var j;

    var t_j;

    var cost;

    for (i = 0; i <= n; ++i) {
        p[i] = i;
    }

    for (j = 1; j <= m; ++j) {
        t_j = second[j - 1];
        d[0] = j;

        for (i = 1; i <= n; i++) {
            cost = first[i - 1] == t_j ? 0 : 1;
            d[i] = Math.min(Math.min(d[i - 1] + 1, p[i] + 1), p[i - 1] + cost);
        }

        _d = p;
        p = d;
        d = _d;
    }

    return p[n];
};


Decisions.register(LevensteinStateComparator, "LevensteinStateComparator");