// "Static" class, which provides unified interface to casper log
// First of all, pass the casper reference to the Logger calling "initLogger(casper)"
// Use "registerSpace()" to set the space of some object. If space if not specified, it will
// register object.constructor.name as a space.
// Then use debug, info, warning and error function to print the log message.

// TODO: add file logging
// TODO: use casper's logLevel information

function Logger() {}

Logger.casper = Logger.casper || {};
Logger.logLevel = Logger.logLevel || null;
Logger.fileLogLevel = Logger.fileLogLevel || null;
Logger.casperVerbose = Logger.casperVerbose || null;

Logger.logFileName = Logger.logFileName || null;
Logger.logStream = Logger.logStream || {};

Logger.objectSpaces = Logger.objectSpaces || {};

Logger.level = {
    "TRACE"   : 0,
    "DEBUG"   : 1,
    "INFO"    : 2,
    "WARNING" : 3,
    "ERROR"   : 4,
    "FATAL"   : 5
};


Logger.initLogger = function (casper) {
    Logger.casper = casper;

    // close log file on exit
    Logger.casper.on("exit", function() {
        if (Logger.logStream !== null)
            Logger.logStream.close();
    });

    Logger.logLevel = Logger.level[Settings.get("logLevel", "INFO").toUpperCase()];
    Logger.fileLogLevel = Logger.level[Settings.get("logFileLevel", "WARNING").toUpperCase()];
    Logger.casperVerbose = Settings.get("logCasperVerbose", false);

    Logger.casper.options.verbose = Logger.casperVerbose;

    var writeToFile = typeof Settings.get("logFile") !== "undefined";

    if (writeToFile) {
        var fileSystem = require("fs");
        Logger.logFileName = Settings.get("logFile");
        Logger.logStream = fileSystem.open(Logger.logFileName, "w");
    }
};


Logger.registerSpace = function (object, space) {
    if (typeof space !== "undefined") {
        Logger.objectSpaces[object.constructor.name] = space;
    } else {
        if (typeof object === "function")
            Logger.objectSpaces[object.name] = object.name;
        else if (typeof object === "object")
            Logger.objectSpaces[object.constructor.name] = object.constructor.name;
    }
};


Logger.trace = function (caller, message) {
    Logger._printMessage(caller, "TRACE", message)
};


Logger.debug = function (caller, message) {
    Logger._printMessage(caller, "DEBUG", message)
};


Logger.info = function (caller, message) {
    Logger._printMessage(caller, "INFO", message)
};


Logger.warning = function (caller, message) {
    Logger._printMessage(caller, "WARNING", message)
};


Logger.error = function (caller, message) {
    Logger._printMessage(caller, "ERROR", message)
};

Logger.fatal = function (caller, message) {
    Logger._printMessage(caller, "ERROR", message);
    Logger.casper.exit(1);
}


Logger._printMessage = function (caller, levelString, message) {
    if (typeof message === "undefined" && typeof caller === "string") {
        message = caller;
        caller = "Common";
    }

    var level = Logger.level[levelString.toUpperCase()];
    if (level >= Logger.level["WARNING"])
        levelString = levelString.toUpperCase();
    else
        levelString = levelString.toLowerCase();

    var doLogging = (Logger.logLevel <= level);
    var doFileLogging = (Logger.fileLogLevel <= level);

    var levelStyle;
    if (level === Logger.level["TRACE"])
        levelStyle = "INFO";
    else if (level === Logger.level["DEBUG"])
        levelStyle = "INFO";
    else if (level === Logger.level["INFO"])
        levelStyle = "PARAMETER";
    else if (level === Logger.level["WARNING"])
        levelStyle = "WARNING";
    else if (level === Logger.level["ERROR"])
        levelStyle = "ERROR";

    var spaceString;
    if (typeof caller === "string")
        spaceString = caller;
    else if (typeof caller === "function")
        spaceString = caller.name;
    else
        spaceString = Logger.objectSpaces[caller.constructor.name];

    var printMessage = [
        casper.getColorizer().colorize(("[" + spaceString + "]").leftPad(" ", 30), "COMMENT"),
        casper.getColorizer().colorize(levelString.rightPad(" ", 7), levelStyle),
        message
    ];

    var filePrintMessage = [
        ("[" + spaceString + "]").leftPad(" ", 30), levelString.rightPad(" ", 7), message
    ];

    if (doLogging)
        casper.echo(printMessage.join(' '));
    if (doFileLogging && Logger.logFileName !== null)
        Logger.logStream.writeLine(filePrintMessage.join('  '));
};


String.prototype.rightPad = function (padString, length) {
    var str = this;
    while (str.length < length)
        str = str + padString;
    return str;
};


String.prototype.leftPad = function (padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
};
