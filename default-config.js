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
        "exports.up = function(dbContext, next){"
        , "    var db = dbContext.resources.db,"
        , "        mongodb = dbContext.resource.mongodb;"
        , ""
        , "    next();"
        , "};"
        , ""
        , "exports.down = function(dbContext, next){"
        , "    var db = dbContext.resources.db,"
        , "        mongodb = dbContext.resources.mongodb;"
        , ""
        , "    next();"
        , "};"
        , ""
    ].join('\n')

};

