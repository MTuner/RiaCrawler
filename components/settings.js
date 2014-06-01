// Settings static class
// Parses the config file and load named parameters and its values.
// Config file must be any JSON-serialized object.

// The properties of this JSON are used as settings properties (by their names);
// If the configuration file contains of:
// { "parameter1": "value1", "parameter2" : ["arrayElem1", "arrayElem2"] }
// Then we can access two properties:
// Settings.get("parameter1") // returns "value1"
// Settings.get("parameter2") // returns array with "arrayElem1" and "arrayElem2" elements

var fileSystem = require('fs');

function Settings() {}
Settings.settings = Settings.settings || {};


Settings.init = function (configFile) {
    var stream = fileSystem.open(configFile, "r");

    var content = stream.read();
    Settings.settings = JSON.parse(JSON.minify(content));
};


Settings.get = function (name, defaultValue) {
    var result = Settings.settings[name];
    if (typeof result === "undefined" && typeof defaultValue !== "undefined")
        return defaultValue;
    return result;
};