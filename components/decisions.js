// Decisions static class.
// Parses the config file at runtime to specify the current decision maker.
// To register the decision maker, use "register(object, decisionType, objectName)" function.
// To create the appropriate decision maker, call "create(decisionType)" function.

// Decisions config file format:
// decisionType : decisionMakerName

var fileSystem = require('fs');

function Decisions() {}
Decisions.decisions = Decisions.decisions || {};
Decisions.objects = Decisions.objects || {};
Logger.registerSpace(Decisions);

Decisions.init = function () {
    var decisionsPath = Settings.get("decisionsPath");
    Logger.info(this, "DECISIONS PATH " + decisionsPath);

    var fileList = fileSystem.list(decisionsPath);
    for (var j = 0; j < fileList.length; ++j) {
        if (fileList[j].indexOf(".js", fileList[j].length - 3) !== -1) {
            phantom.injectJs(decisionsPath + fileList[j]);
            Logger.info(this, "Inject decision: " + fileList[j])
        }
    }

    var decisions = Settings.get("decisions");
    for (var i = 0; i < decisions.length; ++i) {
        for (var type in decisions[i]) {
            Decisions.decisions[type] = decisions[i][type];
        }
    }
};

Decisions.register = function (objectClass, objectName) {
    Decisions.objects[objectName] = objectClass;
};

Decisions.create = function (decisionType) {
    var decisionMakerName = Decisions.decisions[decisionType];

    if (typeof decisionMakerName === "undefined")
        Logger.error(this, "Decision maker for decision " + decisionType + " doesn't exist");
    else if (typeof Decisions.objects[decisionMakerName] == "undefined")
        Logger.error(this, "Decision maker " + decisionMakerName + " is not registered");
    else
        return new Decisions.objects[decisionMakerName];

    return {};
};
