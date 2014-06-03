function Crawler() {
    this.root = {};
    this.target = "";

    this.allDeps = {};
    this.allDepsCount = 0;
    this.navigationUrls = [];

    this.currentState = null;
    this.root = null;

    this.statesCount = 0;
    this.running = false;

    this.stateComparator = Decisions.create("StateComparator");
    this.formHandler = Decisions.create("FormHandler");
    this.authHandler = Decisions.create("AuthHandler");
    this.crawlingController = Decisions.create("CrawlingController");
    Logger.registerSpace(this);
}
Decisions.register(Crawler, "Crawler");


Crawler.prototype.initialize = function (targetUrl) {
    this.target = targetUrl;
    this.allDeps = {};
    this.allDepsCount = 0;
    this.navigationUrls = [];
    this.running = false;

    this.currentState = null;
    this.statesCount = 0;
    this.root = null;

    this.initializeNavigationRestrictions();
    this.initializeNavigationHooks();
};


Crawler.prototype.start = function () {
    this.processInitialTarget();
    this.authorization();

    this.crawl();
};


Crawler.prototype.runCasper = function () {
    this.running = true;
    casper.run()
};


Crawler.prototype.stopCasper = function (message, code) {
    this.running = false;

    this.printResults();

    Logger.info(this, "STOPPED: " + message);

    casper.exit(code)
};


Crawler.prototype.crawl = function () {
    var crawler = this;
    var crawlingController = this.crawlingController;
    casper.then(function () { crawlingController.initialize(crawler.currentState); });

    casper.thenWhileDo(
        function() { return crawlingController.hasToObserve() },
        function() {
            casper.then(function() { crawler.thenTraverseToTheState(crawlingController.getPath()); });
            casper.then(function() { Logger.info(crawler, "State " + crawler.currentState.id + ": crawling"); });
            casper.then(function() { crawler.currentState.updateHandlers(); });

            casper.then(function() {
                if (crawler.currentState.isObserved()) {
                    Logger.info(crawler, "State " + crawler.currentState.id + ": already observed");
                    crawlingController.sameStateRemains(crawler.currentState);
                } else {
                    crawler.formHandler.fillPageForms(casper);
                    crawler.resetNavigatedUrl();
                    crawler.thenObserveHandler();

                    casper.then(function() {
                        var newStateData = crawler.stateComparator.computeCurrentStateData(casper);
                        if (crawler.stateComparator.compareStateData(casper, newStateData, crawler.currentState.data) === false) {
                            var newState = crawler.findExistingState(newStateData);
                            if (newState !== null) {
                                crawler.addNewTransition(crawler.currentState, newState);
                                crawlingController.newTransition(crawler.currentState, newState);
                            } else {
                                var newState = crawler.addNewState(crawler.currentState, newStateData);
                                crawler.currentState.observeFinished(true);
                                crawlingController.newState(crawler.currentState, newState);
                                crawler.currentState = newState;
                            }
                        } else {
                            Logger.info(crawler, "State " + crawler.currentState.id + ": remains");
                            crawlingController.sameStateRemains(crawler.currentState);
                        }
                    })
                }
            })
        }
    );
    casper.then(function () { crawler.finish(); })
};


Crawler.prototype.thenTraverseToTheState = function(path) {
    var crawler = this;
    var currentTraverseState = null;
    var targetState = null;
    if (path === null || path.length === 0) {
        if (this.crawlingController.updateCurrentState() !== null)
            this.currentState = this.crawlingController.updateCurrentState();
        return;
    } else {
        targetState = path[path.length - 1];
        Logger.debug(crawler, "Traverse to the state ##" + targetState.id);
    }

    var i = 0;
    currentTraverseState = path[i];
    if (currentTraverseState !== null) {
        Logger.debug(crawler, "Open stable State #" + currentTraverseState.id);
        casper.open(currentTraverseState.navigatedUrl);
    } else {
        currentTraverseState = crawler.currentState;
    }
    i++;

    casper.thenWhileDo(
        function() { return targetState !== currentTraverseState; },
        function() {
            var stateToGo = path[i];
            var idToGo = stateToGo.id;
            var currentTransition = currentTraverseState.transitions[idToGo][0];
            currentTraverseState = stateToGo;

            crawler.thenMakeTransition(currentTransition);
            casper.then(function() { i = i + 1; })
        }
    );

    casper.then(function () {
        Logger.trace(crawler, "Traverse finished: " + targetState.id);
        crawler.currentState = targetState;
    });
};


Crawler.prototype.thenMakeTransition = function(transition) {
    casper.then(function () {
        Logger.trace(crawler, "Make transition...");
        transition.trigger()
    });

    casper.then(function () {
        casper.wait(Settings.get("observeHandlerTimeout", 30));
    });
};


Crawler.prototype.thenObserveHandler = function() {
   casper.then(function () {
        Logger.trace(crawler, "Observe handler");
        crawler.currentState.observeOneHandler();
    });

    casper.then(function () {
        casper.wait(Settings.get("observeHandlerTimeout", 30));
    }); 
};


// @then
Crawler.prototype.processInitialTarget = function () {
    var crawler = this;

    casper.then(function() { crawler.resetNavigatedUrl() });
    casper.then(function() { casper.open(crawler.target) });

    casper.then(function () {
        var initialState = new StateNode();
        initialState.url = crawler.target;

        crawler.stateComparator.computeAndSetStateData(casper, initialState);
        crawler.root = initialState;
        crawler.currentState = crawler.root;
        crawler.statesCount++;

        crawler.setStableState(crawler.root);
    })
};


// @then
Crawler.prototype.authorization = function () {
    var crawler = this;

    casper.then(function () {
        casper.then(function () {
            crawler.authHandler.initialAuthorization(casper, crawler.formHandler);
            if (crawler.authHandler.formAuthRequired())
                casper.wait(Settings.get("authorizationTimeout", 2000));
        });


        casper.then(function () {
            if (crawler.authHandler.formAuthRequired()) {
                var authorizedPage = new StateNode();
                Logger.warning(crawler, "NEW state (authorized): #" + authorizedPage.id);
                authorizedPage.data = crawler.stateComparator.computeCurrentStateData(casper);
                var handler = {};
                crawler.root.newChildState(handler, authorizedPage);
                authorizedPage.url = casper.getCurrentUrl();

                crawler.navigatedUrl = authorizedPage.url;
                crawler.setStableState(authorizedPage);

                crawler.currentState = authorizedPage;
                crawler.authorizedState = authorizedPage;
            }
        })
    })
};


Crawler.prototype.findExistingState = function (newStateData) {
    var findFunction = function (node) {
        return (crawler.stateComparator.compareStateData(casper, node.data, newStateData));
    };
    return crawler.root.find(findFunction);
};


Crawler.prototype.addNewTransition = function (currentState, existingState) {
    Logger.info(crawler, "NEW transition from state #" + currentState.id + " to the state #" + existingState.id);
    currentState.newTransition(existingState.id);
};


Crawler.prototype.addNewState = function (currentState, newStateData) {
    var newState = new StateNode();
    this.statesCount++;
    newState.url = casper.getCurrentUrl();
    Logger.info(crawler, "NEW state: #" + newState.id);
    newState.data = newStateData;
    currentState.newChildState(newState);

    crawler.setStableState(newState);
    return newState;
};



Crawler.prototype.resetNavigatedUrl = function () {
    this.navigatedUrl = null;
};


Crawler.prototype.setStableState = function (state) {
    var crawler = this;
    if (crawler.navigatedUrl !== null) {
        Logger.debug(crawler, "Set state as stable");

        state.isStable = true;
        state.navigatedUrl = crawler.navigatedUrl;
    }
};


Crawler.prototype.initializeNavigationRestrictions = function() {
    this.ignoreUrlList = Settings.get("ignoreUrlList", []);
    this.ignoreUrlMode = Settings.get("ignoreUrlMode", "");
};


Crawler.prototype.initializeNavigationHooks = function () {
    var crawler = this;

    casper.on('navigation.requested', function (url, navigationType, willNavigate, isMainFrame) {
        if (isMainFrame && willNavigate) {
            crawler.navigatedUrl = url;
        }

        if (willNavigate)
            crawler.navigationUrls.push(url);
    });

    casper.page.originalResourceRequested = casper.page.onResourceRequested;
    casper.page.onResourceRequested = function (requestData, request) {
        casper.page.originalResourceRequested(requestData, request);
        crawler.collectDEP(requestData);

        var requestUrl = requestData.url;

        for (var j = 0; j < crawler.ignoreUrlList.length; ++j) {
            if (requestUrl.match(crawler.ignoreUrlList[j]) !== null) {
                Logger.info(crawler, "Ignore url: " + requestUrl);
                if (crawler.navigatedUrl === requestUrl)
                    crawler.navigatedUrl = null;

                request.abort();
                return;
            }
        }

        var targetUriObject = parseUri(crawler.target);
        var requestUriObject = parseUri(requestUrl);

        var sameDomain = (targetUriObject.host === requestUriObject.host && targetUriObject.port === requestUriObject.port);
        var fromRoot = sameDomain && (requestUriObject.directory.indexOf(targetUriObject.directory) === 0);
        var fromNavigation = false;
        for (var i = 0; i < crawler.navigationUrls.length; ++i) {
            if (crawler.navigationUrls[i] === requestUrl) {
                fromNavigation = true;
                break;
            }
        }

        if (crawler.ignoreUrlMode === "FROM_ROOT_ONLY" && !fromRoot) {
            Logger.info(crawler, "Ignore url (FROM_ROOT restriction): " + requestUrl);
            if (crawler.navigatedUrl === requestUrl)
                crawler.navigatedUrl = null;
            request.abort();
        }
        else if (crawler.ignoreUrlMode === "SAME_DOMAIN" && !sameDomain) {
            Logger.info(crawler, "Ignore url (SAME_DOMAIN restriction): " + requestUrl);
            if (crawler.navigatedUrl === requestUrl)
                crawler.navigatedUrl = null;
            request.abort();
        }
        else if (fromNavigation) {
            if (crawler.ignoreUrlMode === "FROM_ROOT_IN_NAVIGATION" && !fromRoot) {
                Logger.info(crawler, "Ignore url (FROM_ROOT_IN_NAVIGATION restriction): " + requestUrl);
                if (crawler.navigatedUrl === requestUrl)
                    crawler.navigatedUrl = null;
                request.abort();
            }
            else if (crawler.ignoreUrlMode === "SAME_DOMAIN_IN_NAVIGATION" && !sameDomain) {
                Logger.info(crawler, "Ignore url (SAME_DOMAIN_IN_NAVIGATION restriction): " + requestUrl);
                if (crawler.navigatedUrl === requestUrl)
                    crawler.navigatedUrl = null;
                request.abort();
            }
        }
    }
};


Crawler.prototype.collectDEP = function(requestData) {
    if (typeof crawler.allDeps[requestData.url] === "undefined") {
        crawler.allDeps[requestData.url] = {
            "index": crawler.allDepsCount,
            "url": requestData.url
        };
        crawler.allDepsCount++;
    }
};


Crawler.prototype.finish = function () {
    this.running = false;
};


Crawler.prototype.printResults = function () {
    this.bfsQueue = [];
    this.bfsQueue.push(this.root);

    Logger.info(this, "STATES:");
    var statesCount = 0;
    var writeToFile = typeof Settings.get("createDotFile") !== "undefined";

    var dotFile = "";
    if (writeToFile) {
        var fileSystem = require("fs");
        dotFile = fileSystem.open(Settings.get("createDotFile"), "w");
        dotFile.writeLine("digraph States {");
    }
    var dotComments = [];


    while (this.bfsQueue.length > 0) {
        var state = this.bfsQueue.shift();
        statesCount++;

        Logger.info(this, state.id + ": " + state.url);
        if (writeToFile) {
            dotFile.writeLine(state.id + " [label=\"" + state.id + "\"];");
            dotComments.push("#" + state.id + ": " + state.url + "");
        }

        for (var toId in state.transitions) {
            for (var i = 0; i < state.transitions[toId].length; ++i) {
                var transition = state.transitions[toId][i];
                Logger.info(this, "Transition: " + state.id + "->" + toId + ": " + transition.key() + " " + transition.event());

                if (writeToFile) {
                    dotFile.writeLine(state.id + "->" + toId + " [label=\"" + state.id + "->" + toId + "-" + i + "\"];");
                    dotComments.push("#" + state.id + "->" + toId + "-" + i + ": " + transition.key() + ", " + transition.event() + "");
                }
            }
        }

        var childrenStates = state.getChildren();
        for (var i = 0; i < childrenStates.length; i++) {
            this.bfsQueue.push(childrenStates[i]);
        }
    }

    if (writeToFile) {
        for (var j = 0; j < dotComments.length; ++j) {
            dotFile.writeLine(dotComments[j]);
        }
        dotFile.writeLine("}");
        dotFile.close();
    }

    Logger.info(this, "Number of states: " + statesCount);

    this.printDeps();
};


Crawler.prototype.printDeps = function () {
    var crawler = this;
    Logger.info(crawler, "DEPS: ");
    for (var url in crawler.allDeps) {
        Logger.info(this, "*" + url);
    }
};


StateNode.prototype.pathFromLastStable = function () {
    var path = [];

    path.push(this);
    var root = this;

    while (root.getParent() && root.isStable !== true) {
        root = root.getParent();
        path.push(root);
    }

    return path.reverse();
};
