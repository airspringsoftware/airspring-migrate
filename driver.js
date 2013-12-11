/*
 * Requirements
 */
var mongodb = require('mongodb'),
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

        var server = new mongodb.Server(opts.host, opts.port, {});

        new mongodb.Db(opts.db, server, {safe: true}).open(function (err, db) {
            if (err) {
                return complete(err);
            }
            var migrationStorageController = new self.MigrationStorageController(db);

            complete (null, {
                migrationStorageController: migrationStorageController,
                resources: {
                    'mongodb': mongodb,
                    'db': db
                }
            });
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