var webserver = require('webserver');

function CommandServer() {
    Logger.registerSpace(this);
    this.server = webserver.create();

    this.urlRegExp = /^(?:([^:\/?\#]+):)?(?:\/\/([^\/?\#]*))?([^?\#]*)(?:\?([^\#]*))?(?:\#(.*))?/;
}


CommandServer.prototype.initialize = function (crawler, casper) {
    this.crawler = crawler;
    this.listenPort = Settings.get("commandListenPort", "8089");

    Logger.info(this, "Start listening at " + this.listenPort);

    var crawler = this.crawler;
    var s = this;
    this.server.listen(this.listenPort, function(request, response) {
        var url = request.url;
        var result = url.match(s.urlRegExp);
        var url_scheme    = result[1] || null;
        var url_authority = result[2] || null;
        var url_path      = result[3] || null;
        var url_query     = result[4] || null;
        var url_fragment  = result[5] || null;

        if (!result) {
            s._writeFail(response);
            response.closeGracefully();
            return;
        }

        response.statusCode = 200;

        var params = {};
        if (url_query !== null) {
            var requestParamPairs = url_query.split(/[&;]/);
            for (var i = 0; i < requestParamPairs.length; ++i) {
                var pair = requestParamPairs[i].split("=");
                params[pair[0]] = pair[1]
            };
        }

        var command = params["command"];
        if (typeof command === "undefined") {
            s._writeFail(response)
        } else if (command === "start") {
            crawler.runCasper();
            response.write('{"started" : true}')
        } else if (command === "stop") {
            response.write('{"stopped" : true}')
            response.close();
            crawler.stopCasper("Stopped by the remote command request", 0)
        } else if (command === "sync") {
            var object = {
                "running": crawler.running,
                // "deps": depsToSend,
                "states_detected": crawler.statesCount,
                "requests_made": crawler.allDepsCount
            };

            response.setHeader("Content-Type", "application/json")
            response.write(JSON.stringify(object))
        } else {
            s._writeFail(response, "unknown command")
        }

        response.closeGracefully();
    });
};


CommandServer.prototype._writeFail = function(response, failString) {
    response.statusCode = 400;
    if (typeof failString !== "undefined")
        response.write(failString)
};
