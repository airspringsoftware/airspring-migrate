/*
 * Requirements
 */
var mongodb = require('mongodb');

/*
 * Object for export
*/
var Driver =  {
    getConnection: function (opts, complete) {
        opts = getDbOpts(opts);

        var mongodb = require('mongodb'),
            server = new mongodb.Server(opts.host, opts.port, {});

        new mongodb.Db(opts.db, server, {safe: true}).open(function (err, db) {
            if (err) {
                return complete(err);
            }

            var collection = new mongodb.Collection(db, 'migrations');
            complete (null, {
                connection: db,
                migrationCollection: collection,
                requirements: {
                    'mongodb': mongodb
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

/* Exports */
module.exports = Driver;