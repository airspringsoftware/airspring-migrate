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
    host : "localhost",
    port: 27017,
    db   : "test-db",
    driver: new (require(__dirname + "/driver.js"))(),
    template: [
        "exports.up = function(resources, next){",
        "    var db = resources.db,",
        "        mongojs = resources.mongojs;",
        "",
        "    next();",
        "};",
        "",
        "exports.down = function(resources, next){",
        "    var db = resources.db,",
        "        mongojs = resources.mongojs;",
        "",
        "    next();",
        "};",
        ""
    ].join('\n')

};

