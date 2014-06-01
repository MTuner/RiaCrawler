function InitCasper() {}
InitCasper.onErrorFunction = function(self, m) {
    Logger.fatal("Common", m);
//    self.echo('FATAL: ' + m, "ERROR");
//    self.exit();
};

InitCasper.onPageInitializedFunction = function(self) {
    var eventUtils = "utils/eventUtils.js";
    var ajaxHook = "utils/ajaxHook.js";

    Logger.trace("Casper", "INIT script " + eventUtils + ": " + self.injectJs(eventUtils));

    var params = {};
    params["setTimeoutHooksEnabled"] = Settings.get("setTimeoutHooksEnabled", false);
    params["setTimeoutHookThreshold"] = Settings.get("setTimeoutHookThreshold", 300);
    params["setIntervalHookThreshold"] = Settings.get("setIntervalHookThreshold", 300);
    self.evaluate(function(params) {
        EventUtils.setPageParams(params)
        }, params);

    if (Settings.get("synchronousAjax") === true) {
        Logger.trace("Casper", "INIT script " + ajaxHook + ": " + self.injectJs(ajaxHook));
    }
};

InitCasper.onResourceRequestedFunction = function (requestData) {
    Logger.debug("Casper", "Resource requested: " + requestData.url);
    casper.allDeps = casper.allDeps || {};
    casper.allDeps[requestData.url] = true;
};

InitCasper.onPageErrorFunction = function (msg, trace) {
    casper.echo("JSError: " + msg, 'ERROR');
    trace.forEach(function (item) {
        casper.echo('  ' + item.file + ': ' + item.line, "WARNING");
    })
};

InitCasper.onNavigationRequestedFunction = function (url, navigationType, willNavigate, isMainFrame) {
    Logger.info("Casper", "Navigation: " + url);
};


InitCasper.onConsoleMessage = function (msg) {
    if (Settings.get("logCasperVerbose", false))
        Logger.debug("JS Evaluate", msg);
};
