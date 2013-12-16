var _ = require('Underscore'),
    path = require('path'),
    join = path.join;

module.exports = Configuration;

function Configuration(options) {
    if (typeof options !== 'undefined'){
        _.extend(Configuration.prototype, options);
    }
}

Configuration.prototype = {
    constructor: Configuration,
    connectionOptions: {
        host : "localhost",
        port: 27017,
        db   : "app-db"
    },
    driver: new (require(__dirname + "/driver.js"))(),
    template: [
        "exports.up = function(resources, next){"
        , "    var db = resources.db,"
        , "        mongodb = resources.mongodb;"
        , ""
        , "    next();"
        , "};"
        , ""
        , "exports.down = function(resources, next){"
        , "    var db = resources.db,"
        , "        mongodb = resources.mongodb;"
        , ""
        , "    next();"
        , "};"
        , ""
    ].join('\n')

};

