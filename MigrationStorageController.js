var _ = require('underscore');
module.exports = MigrationStorageController;

var self;
function MigrationStorageController (db, options) {
    this.storageName = 'migrations';
    this.db = db;
    this.options = options || {};
    self = this;
}

MigrationStorageController.prototype = {
    constructor: MigrationStorageController,
    hasMigrationStorage: function(complete) {
        this.db.getCollectionNames(function(err, names){
            if (typeof complete === "function") {
                complete(err, _.contains(names, self.storageName));
            }
        });
    },
    createMigrationStorage: function (complete) {
        this.db.createCollection(this.storageName, function(err, storage) {
            complete(err, storage);
        });
    },
    getAllMigrationEntries: function (complete) {
        var storage = this.db.collection(this.storageName);
        storage.find({}).sort({num: -1}, complete);
    },
    getFirstMigrationEntry: function (complete) {
        var storage = this.db.collection(this.storageName);
        storage.find({}).sort({num: 1}).limit(1, function(err, collection) {
            if (err)  return complete(err, null);

            if (collection.length > 0) {
                complete(err, collection[0]);
            } else {
                complete(err, null);
            }
        });
    },
    getLastMigrationEntry: function (complete) {
        var storage = this.db.collection(this.storageName);
        storage.find({}).sort({num: -1}).limit(1, function(err, collection) {
            if (err)  return complete(err, null);

            if (collection.length > 0) {
                complete(err, collection[0]);
            } else {
                complete(err, null);
            }
        });
    },
    addMigrationEntry: function (migration, complete) {
        var storage = this.db.collection(this.storageName);
        storage.insert({
            num: migration.num || parseInt(migration.title.match(/\d+/)[0].split('-')[0], 10),
            title: migration.title.split('/').pop().split('.js')[0],
            executed: new Date()
        }, function (err, objects) {
            if (err) return complete(err, objects);
            complete(err, objects);
        });
    },
    migrationEntryExists: function(migration, complete) {
        var storage = this.db.collection(this.storageName);
        storage.find({ title: migration.title }, function(err, collection) {
            if (err) return complete(err, null);

            complete(null, collection.length > 0);
        });
    },
    removeMigrationEntry: function (migration, complete) {
        var storage = this.db.collection(this.storageName);
        storage.findAndModify({
            query: { num: migration.num },
            remove: true
        }, function (err, doc) {
            if (err) return complete(err, doc);
            complete(err, doc);
        });
    }
};