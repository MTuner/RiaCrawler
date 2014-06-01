function DiffStateComparator() {
    DiffStateComparator.superclass.constructor.apply(this);
}
extend(DiffStateComparator, StateComparator);


DiffStateComparator.getDocumentHtml = function () {
    return document.getElementsByTagName("body")[0].innerHTML;
};


DiffStateComparator.prototype.computeCurrentStateData = function (casper) {
    return [casper.evaluate(DiffStateComparator.getDocumentHtml),
            casper.getCurrentUrl()];
};


DiffStateComparator.prototype.computeAndSetStateData = function (casper, state) {
    state.data = [ casper.evaluate(DiffStateComparator.getDocumentHtml),
                   casper.getCurrentUrl() ];
};


DiffStateComparator.prototype.compareStateData = function (casper, first, second) {
    return casper.evaluate(function (first, second, ignoreList) {
        var firstDoc = document.createElement("html");
        firstDoc.innerHTML = first[0];

        var secondDoc = document.createElement("html");
        secondDoc.innerHTML = second[0];

        if (typeof ignoreList !== "undefined") {
            var firstElementsToIgnore = [];
            var secondElementsToIgnore = [];

            for (var i = 0; i < ignoreList.length; ++i) {
                if (first[1] === ignoreList[i].url) {
                    var node = firstDoc.querySelector(ignoreList[i].selector);
                    if (node !== null && node.parentNode) {
                        firstElementsToIgnore.push(node);
                    }
                }

                if (second[1] === ignoreList[i].url) {
                    var node = secondDoc.querySelector(ignoreList[i].selector);
                    if (node !== null && node.parentNode) {
                        secondElementsToIgnore.push(node);
                    }
                }
            }

            for (var j = 0; j < firstElementsToIgnore.length; ++j)
                firstElementsToIgnore[j].parentNode.removeChild(firstElementsToIgnore[j]);
            for (var j = 0; j < secondElementsToIgnore.length; ++j)
                secondElementsToIgnore[j].parentNode.removeChild(secondElementsToIgnore[j]);
        }

        var result = firstDoc.isEqualNode(secondDoc);

        // clear the memory
        firstDoc.innerHTML = "";
        secondDoc.innerHTML = "";
        return result;

    }, first, second, Settings.get("DiffStateComparator.ignoreList"));
};


Decisions.register(DiffStateComparator, "DiffStateComparator");