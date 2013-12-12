var mongodb = require('mongodb');
module.exports = MigrationStorageController;

function MigrationStorageController (db, options) {
    this.storageName = 'migrations';
    this.storage = new mongodb.Collection(db, this.storageName);
    this.db = db;
    this.options = options || {};
}

MigrationStorageController.prototype = {
    constructor: MigrationStorageController,
    hasMigrationStorage: function(complete) {
        this.db.collectionsInfo(this.storageName).toArray(function (err, items) {
            if (typeof complete === 'function') {
                complete(err, items.length > 0);
            }
        });
    },
    createMigrationStorage: function (complete) {
        var self = this;
        this.db.createCollection(this.storageName, function(err, storage) {
            if (!err) self.storage = storage;
            complete(err, storage);
        });
    },
    getAllMigrationEntries: function (complete) {
        this.storage.find({}).sort({num: -1}).toArray(complete);
    },
    getFirstMigrationEntry: function (complete) {
        this.storage.find({}).sort({num: 1}).limit(1).toArray(complete);
    },
    getLastMigrationEntry: function (complete) {
        this.storage.find({}).sort({num: -1}).limit(1).toArray(complete);
    },
    addMigrationEntry: function (migration, complete) {
        var self = this;
        this.storage.insert({
            num: migration.num || parseInt(migration.title.match(/\d+/)[0].split('-')[0], 10),
            title: migration.title.split('/').pop().split('.js')[0],
            executed: new Date()
        }, function (err, objects) {
            if (err) {
                complete(err, objects);
                //throw new Error('Error saving migration run: ' + migration.title + '\nerr: ' + err));
                //console.error('Error saving migration run: ', migration.title, '\nerr: ', err);
                //process.exit(1);
            }

            complete(err, objects);
        });
    },
    removeMigrationEntry: function (migration, complete) {
        this.storage.findAndModify({ num: migration.num }, [], {}, { remove: true }, function (err, doc) {
            if (err) {
                complete(err, doc);
                //console.error('Error removing migration from DB: ', migration.title, '\nerr: ', err);
                //process.exit(1);
            }

            complete(err, doc);
        });
    }
};