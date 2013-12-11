var port = 27017,
    serverName = 'localhost',
    dbName = 'db-test',
    db = null,
    self = this;

var mongodb = require('mongodb'),
    MigrationStorageController = require('../MigrationStorageController.js'),
    dbPath = 'mongodb://' + serverName + ':' + port + '/' + dbName,
    support = require('./DataBaseMigrationSpec-Support.js')(dbPath);

// Specify the default timeout
jasmine.getEnv().defaultTimeoutInterval = 80000;


/* ---- Begin Tests ---- */
describe("test core functionality of migration tool",function() {
    it('test MigrationStorageController', function(done) {
        server = new mongodb.Server(serverName, port, {});

        new mongodb.Db(dbName, server, {safe: true}).open(function (err, db) {
            expect(err).toBeFalsy();
            self.db = db;

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
                        storage.getAllMigrationEntries(function (err, migrations) {
                            expect(err).toBeFalsy();
                            expect(migrations.length).toBe(0);

                            done();
                        });
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
                        expect(m.length).toBe(1);


                        console.log('First: ' + m[0].title.split('-')[1]);
                        expect(m[0].title.split('-')[1]).toBe('test0');

                        storage.getLastMigrationEntry(function(err, m) {
                            expect(err).toBeFalsy();
                            expect(m.length).toBe(1);

                            console.log('title: ' + m[0].title + '; ' + cur  + '-' + 'test' + i);
                            expect(m[0].title).toBe(cur  + '-' + 'test' + i);

                            if (i < 4) {
                                runTests(++i);
                            } else {
                                storage.getAllMigrationEntries(function (err, migrations) {
                                    expect(err).toBeFalsy();
                                    expect(migrations.length).toBe(5);
                                    removeMigrations();
                                });
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

    it('test migrations through the command line', function(done) {
        support.runCreate({ 'migrationName': 'test1', 'callback': done });
    });

    afterEach(function (done) {
        if (self.db !== null) {
            support.afterEach(['migrations'], function(err, reply){
                if (err) console.error(err);

                done();
            });
        }
    });
});