var _ = require('underscore');
module.exports = MigrationStorageController;

function MigrationStorageController (db, options) {
    this.storageName = 'migrations';
    this.storage = db.collection(this.storageName);
    this.db = db;
    this.options = options || {};
}

MigrationStorageController.prototype = {
    constructor: MigrationStorageController,
    hasMigrationStorage: function(complete) {
        this.db.getCollectionNames(function(err, names){
            if (typeof complete === "function") {
                complete(err, _.contains(names, this.storageName));
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
        this.storage.find({}).sort({num: -1}, complete);
    },
    getFirstMigrationEntry: function (complete) {
        this.storage.find({}).sort({num: 1}).limit(1, function(err, collection) {
            if (err)  return complete(err, null);

            if (collection.length > 0) {
                complete(err, collection[0]);
            } else {
                complete(err, null);
            }
        });
    },
    getLastMigrationEntry: function (complete) {
        this.storage.find({}).sort({num: -1}).limit(1, function(err, collection) {
            if (err)  return complete(err, null);

            if (collection.length > 0) {
                complete(err, collection[0]);
            } else {
                complete(err, null);
            }
        });
    },
    addMigrationEntry: function (migration, complete) {
        var self = this;
        this.storage.insert({
            num: migration.num || parseInt(migration.title.match(/\d+/)[0].split('-')[0], 10),
            title: migration.title.split('/').pop().split('.js')[0],
            executed: new Date()
        }, function (err, objects) {
            if (err) return complete(err, objects);
            complete(err, objects);
        });
    },
    removeMigrationEntry: function (migration, complete) {
        this.storage.findAndModify({
            query: { num: migration.num },
            remove: true
        }, function (err, doc) {
            if (err) return complete(err, doc);
            complete(err, doc);
        });
    }
};