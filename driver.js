/*
 * Requirements
 */
var mongojs = require('mongojs'),
    _ = require('Underscore'),
    MigrationStorageController = require('./MigrationStorageController.js');

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
    getConnection: function (opts, complete) {
        try {
            otps = self.getDbOpts(opts);
        } catch (ex) {
            return complete(ex, null);
        }

        var dbMongoJS = mongojs(opts.host + ':' + opts.port + '/' + opts.db);
        var migrationStorageController = new MigrationStorageController(dbMongoJS);

        complete (null, {
            migrationStorageController: migrationStorageController,
            resources: {
                'mongojs': mongojs,
                'db': dbMongoJS
            }
        });

    },
    getDbOpts: function (opts) {
        opts = _.extend({
            host: 'localhost',
            port: 27017 }, opts);

        if (typeof opts.db === 'undefined') throw new Error('You must supply a valid database option in the config');

        return opts;
    }
};