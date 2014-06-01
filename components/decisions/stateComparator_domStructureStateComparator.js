function DomStructureStateComparator() {
    DomStructureStateComparator.superclass.constructor.apply(this);
}
extend(DomStructureStateComparator, StateComparator);


DomStructureStateComparator.getDocumentStructure = function () {
    function removeTextNodes(root) {
        var n, a=[], walk=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        while (n=walk.nextNode()) {
            n.nodeValue = "";
        }
    }
    function removeInvisibleNodes(root) {
        var n, a=[], walk=document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
        while (n=walk.nextNode()) {
            if (walk.currentNode.style && walk.currentNode.style.display && walk.currentNode.style.display === "none")
                walk.currentNode.parentNode.removeChild(walk.currentNode)
        }
    }

    var recursiveClone = true;
    var cloned = document.getElementsByTagName("body")[0].cloneNode(recursiveClone);
    removeInvisibleNodes(cloned);
    removeTextNodes(cloned);

    return cloned.innerHTML;
};


DomStructureStateComparator.prototype.computeCurrentStateData = function (casper) {
    return casper.evaluate(DomStructureStateComparator.getDocumentStructure).replace(/ /g, "");
};


DomStructureStateComparator.prototype.computeAndSetStateData = function (casper, state) {
    state.data = casper.evaluate(DomStructureStateComparator.getDocumentStructure).replace(/ /g, "");
};


DomStructureStateComparator.prototype.compareStateData = function (casper, first, second) {
    return DomStructureStateComparator._isEqual(first, second);
};


DomStructureStateComparator._isEqual = function (first, second) {
    var s1 = first;
    var s2 = second;

    if (Settings.get("DomStructureStateComparator.normalizeAttributes", false)) {
        var values = casper.evaluate(function (first, second) {
            var attributesTable = {};

            var firstDoc = document.createElement("body");
            firstDoc.innerHTML = first;

            var secondDoc = document.createElement("body");
            secondDoc.innerHTML = second;

            var normalized = 0;
            function normalizeAttributes(root) {
                var n, a=[], walk=document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
                while (n=walk.nextNode()) {
                    for (var i=0, attrs=n.attributes, l=attrs.length; i<l; i++){
                        attributesTable[attrs.item(i).nodeValue] = attributesTable[attrs.item(i).nodeValue] || ("" + (normalized++))
                        n.setAttribute(attrs.item(i).nodeName, attributesTable[attrs.item(i).nodeValue]);
                    }
                }
            }
            normalizeAttributes(firstDoc);
            normalizeAttributes(secondDoc);

            return [firstDoc.innerHTML, secondDoc.innerHTML];
        }, first, second);

        s1 = values[0];
        s2 = values[1];
    }

    s1 = s1 + " ";
    s2 = s2 + " ";
    var distance = DomStructureStateComparator._computeDistance(s1, s2);
    var avglen = (s1.length + s2.length) / 2;
    return (distance / avglen) < 0.00001;
};


DomStructureStateComparator._computeDistance = function (first, second) {
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


Decisions.register(DomStructureStateComparator, "DomStructureStateComparator");