var mongodb = require('mongodb'),
    MigrationStorageController = require('../MigrationStorageController.js');

// Specify the default timeout
jasmine.getEnv().defaultTimeoutInterval = 80000;

/* ---- Begin Tests ---- */
describe("test core functionality of migration tool",function() {
    it('test MigrationStorageController', function(done) {
        server = new mongodb.Server('localhost', 27017, {});

        new mongodb.Db('db-test', server, {safe: true}).open(function (err, db) {
            expect(err).toBeFalsy();

            var removeMigrations = function () {
                var storage = new MigrationStorageController(db);

                storage.getFirstMigrationEntry(function(err, object) {
                    expect(err).toBeFalsy();

                    if (object.length > 0) {
                        var m = object[0];
                        console.log('removing: ' + JSON.stringify(object));

                        storage.removeMigrationEntry(m, function(err, object){
                            expect(err).toBeFalsy();

                            removeMigrations();
                        });
                    } else {
                        process.exit();
                    }

                });
            };

            var runTests = function (i) {
                var cur = Date.now();
                var storage = new MigrationStorageController(db);
                var migration = {
                    num: cur,
                    title: cur  + '-' + 'test' + i + '.js'
                };

                storage.addMigrationEntry(migration, function(err, object) {
                    expect(err).toBeFalsy();

                    console.log('inserted: ' + JSON.stringify(object));

                    storage.getFirstMigrationEntry(function (err, m) {
                        expect(err).toBeFalsy();

                        console.log('First: ' + JSON.stringify(m));

                        storage.getLastMigrationEntry(function(err, m) {
                            expect(err).toBeFalsy();

                            console.log('last: ' + JSON.stringify(m));

                            if (i < 4) {
                                runTests(++i);
                            } else {
                                removeMigrations();
                            }

                        });
                    });
                });
            };


            var storage = new MigrationStorageController(db);
            storage.hasMigrationStorage(function (err, exists) {
                expect(err).toBeFalsy();

                console.log('exists: ' + exists.toString());

                storage.createMigrationStorage(function (err, collection) {
                    expect(err).toBeFalsy();

                    console.log('collection: ' + collection);
                    storage.hasMigrationStorage(function (err, exists) {
                        expect(err).toBeFalsy();

                        console.log('exists: ' + exists.toString());
                        runTests(0);
                    });

                });
            });
        });
    });
});