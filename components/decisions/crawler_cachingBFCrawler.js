function CachingCrawler() {
    CachingCrawler.superclass.constructor.apply(this);
    Logger.registerSpace(this);
}
extend(CachingCrawler, Crawler);
Decisions.register(CachingCrawler, "CachingCrawler");


CachingCrawler.prototype.processInitialTarget = function () {
    var crawler = this;

    crawler.collectCache(true);
    casper.then(function () { CachingCrawler.superclass.processInitialTarget.apply(crawler); });
    casper.then(function() { crawler.collectCache(false);  })
};


CachingCrawler.prototype.authorization = function () {
    var crawler = this;
    casper.then(function() { crawler.collectCache(true); })
    casper.then(function () { CachingCrawler.superclass.authorization.apply(crawler); });
    casper.then(function() { crawler.collectCache(false); })
};


CachingCrawler.prototype.observeHandler = function () {
    this.collectCache(true);
    CachingCrawler.superclass.observeHandler.call(this);
}


CachingCrawler.prototype.finish = function () {
    casper.then(function () {
        crawler.command = "reset";
        sendServiceCommand();
    })
}


CachingCrawler.prototype.setStableState = function (state) {
    if (!crawler.isCacheCollected) {
        Logger.warning(crawler, "Cache was not collected");
    }
    else {
        if (crawler.navigatedUrl !== null) {
            CachingCrawler.superclass.setStableState.call(this, state);
            state.cacheParams = {};
            for (var i in crawler.cacheIds)
                state.cacheParams[i] = crawler.cacheIds[i];
        }
    }
};


CachingCrawler.prototype.setTransitionCache = function (transition) {
    transition.cacheParams = {};
    for (var i in crawler.cacheIds) {
        transition.cacheParams[i] = crawler.cacheIds[i];
    }
};


CachingCrawler.prototype.addNewTransition = function (currentState, existingState) {
    crawler.setTransitionCache(crawler.observedHandler);
    CachingCrawler.superclass.addNewTransition.call(crawler, currentState, existingState);
}


CachingCrawler.prototype.addNewState = function (currentState, newStateData) {
    crawler.setTransitionCache(crawler.observedHandler);
    return CachingCrawler.superclass.addNewState.call(crawler, currentState, newStateData);
}


CachingCrawler.prototype.traverseToTheCurrentState = function () {
    // Disable any "cache spying"
    crawler.collectCache(false);
    CachingCrawler.superclass.traverseToTheCurrentState.call(this);
};


CachingCrawler.prototype.makeCurrentTransition = function () {
    var crawler = this;
    casper.then(function () { crawler.enableCache(crawler.currentTransition.cacheParams); });
    casper.then(function () { CachingCrawler.superclass.makeCurrentTransition.call(crawler) });
    casper.then(function () { crawler.disableCache(crawler.currentTransition.cacheParams); });
}


CachingCrawler.prototype.openStableState = function () {
    var crawler = this;

    casper.then(function () { crawler.enableCache(crawler.currentTraverseState.cacheParams); });
    casper.then(function () { CachingCrawler.superclass.openStableState.call(crawler); });
    casper.then(function () { crawler.disableCache(crawler.currentTraverseState.cacheParams); })
};


CachingCrawler.prototype.enableCache = function (cacheParams) {
    crawler.command = "useCached:";

    for (var requestId in cacheParams) {
        var responseId = cacheParams[requestId];
        crawler.command = crawler.command + requestId + "=" + responseId + ",";
    }
    crawler.command = crawler.command.substring(0, crawler.command.length - 1);
    sendServiceCommand();
};


CachingCrawler.prototype.disableCache = function (cacheParams) {
    crawler.command = "disabled:";

    for (var requestId in cacheParams) {
        crawler.command = crawler.command + requestId + ",";
    }
    crawler.command = crawler.command.substring(0, crawler.command.length - 1);
    sendServiceCommand();
};


var sendServiceCommand = function () {
    casper.then(function () {
        casper.evaluate(sendOperationalXmlHttpRequest, crawler.command, Settings.get("synchronousServiceAjax"),
                        Settings.get("serviceRequest", "_CRAWLER_SERVICE_"));
    })
};


var sendOperationalXmlHttpRequest = function (params, sync, serviceUrl) {
    if (params.substring(params.indexOf(":")) === "")
        return;

    var oReq = new XMLHttpRequest();
    oReq.open("GET", serviceUrl + "?" + params, !sync);
    oReq.send();
};


CachingCrawler.prototype.initializeNavigationHooks = function () {
    CachingCrawler.superclass.initializeNavigationHooks.apply(this);

    casper.on('resource.received', function (resource) {
        if (typeof resource.headers.get !== "undefined") {
            var cacheInfo = resource.headers.get(Settings.get("serviceHeaderResponse", "CRAWLER_CACHE_INFO"));
            if (cacheInfo !== null) {
                crawler.cacheIds = crawler.cacheIds || {};
                var requestId = parseInt(cacheInfo.trim().split("=")[0]);
                var responseId = parseInt(cacheInfo.trim().split("=")[1]);
                crawler.cacheIds[requestId] = responseId;
            }
        }
    })
};


CachingCrawler.prototype.collectCache = function (collect) {
    if (collect === true) {
        crawler.isCacheCollected = true;
        crawler.cacheIds = {}
    }
    else {
        crawler.isCacheCollected = false;
    }
    crawler.navigatedUrl = null;
};


CachingCrawler.prototype.collectDEP = function(url) {
    if (url.indexOf(Settings.get("serviceRequest", "_CRAWLER_SERVICE_")) === -1) {
        crawler.allDeps[url] = true;
    }
}
