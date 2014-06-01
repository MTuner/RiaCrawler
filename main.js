// casperJS initialization
var fileSystem = require('fs');
phantom.casperPath = fileSystem.workingDirectory + "/casperJS_patched";
phantom.injectJs(phantom.casperPath + '/bin/bootstrap.js');
phantom.injectJs("utils/casperInit.js");

// inject utils
phantom.injectJs("utils/extend.js");
phantom.injectJs("utils/treeNode.js");
phantom.injectJs("utils/parseUri.js");
phantom.injectJs("utils/minify-sans-regexp.js");
phantom.injectJs("utils/q.js");

// components
phantom.injectJs("components/settings.js");
phantom.injectJs("components/logger.js");
phantom.injectJs("components/decisions.js");
phantom.injectJs("components/stateNode.js");
phantom.injectJs("components/crawler.js");
phantom.injectJs("components/commandServer.js");
phantom.injectJs("components/handlersContainer.js");
phantom.injectJs("components/stateComparator.js");
phantom.injectJs("components/crawlingController.js");
phantom.injectJs("components/eventHandler.js");
phantom.injectJs("components/authHandler.js");
phantom.injectJs("components/formHandler.js");


// Casper initialization
var casper = require('casper').create({
    verbose: false,
    logLevel: "debug",
    retryTimeout: 10,

    // CasperJS exceptions handler
    onError: InitCasper.onErrorFunction,
    onPageInitialized: InitCasper.onPageInitializedFunction
});

casper.on('resource.requested', InitCasper.onResourceRequestedFunction);
casper.on('navigation.requested', InitCasper.onNavigationRequestedFunction);

casper.start();
casper.page.onError = InitCasper.onPageErrorFunction; // JS exceptions handler
casper.page.onConsoleMessage = InitCasper.onConsoleMessage;

// Start crawling
if (!casper.cli.has("target") || !casper.cli.has("config")) {
  Logger.error(casper, "Usage: phantomjs --target=<targetUrl> --config=<configFilePath>");
  casper.exit();
}

// Components initialization
Settings.init(casper.cli.get("config"));
Logger.initLogger(casper);
Decisions.init();


var targetUrl = casper.cli.get("target");
var crawler = Decisions.create("Crawler");

var commandServer = new CommandServer(crawler);
commandServer.initialize(crawler, casper);


crawler.initialize(targetUrl);
crawler.start();

// Print results
casper.then(function () { crawler.printResults(); });

// HACK: imitate forever waiting
if (Settings.get("immediateStop", false) === false) {
    casper.thenWhileDo(
        function() { return true; },
        function() {
            casper.then(function() { casper.wait(3000) });
        }
    );
} else {
    casper.then(function() { crawler.stopCasper("Crawling finished", 0) })
}

if (Settings.get("immediateStart", false) === true)
    crawler.runCasper();


