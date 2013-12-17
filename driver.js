/*
 * Requirements
 */
var mongojs = require('mongojs'),
    _ = require('Underscore');

/* Exports */
var self = null;
module.exports = Driver;
function Driver (options) {
    if (typeof options !== undefined) {
        _.extend(Driver.prototype, options);
    }

    self = this;
}

Driver.prototype =  {
    constructor: Driver,
    MigrationStorageController: require('./MigrationStorageController.js'),
    getConnection: function (opts, complete) {
        opts = getDbOpts(opts);

        var dbMongoJS = mongojs(opts.host + ':' + opts.port + '/' + opts.db);
        var migrationStorageController = new self.MigrationStorageController(dbMongoJS);

        complete (null, {
            migrationStorageController: migrationStorageController,
            resources: {
                'mongojs': mongojs,
                'db': dbMongoJS
            }
        });


    }
};

/* --- Private Functions --- */

/*
 * Fills in defaults in the event that the config file is null
 */
function getDbOpts(opts) {
    opts = opts || {
        host: 'localhost',
        db: 'my-app',
        port: 27017
    };
    opts.port = opts.port || 27017;
    return opts;
}