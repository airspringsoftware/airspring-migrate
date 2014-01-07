var port = 27017,
    serverName = 'localhost',
    dbName = 'db-test',
    db = null,
    self = this;

var Migrations = require('../'),
    MigrationStorageController = Migrations.MigrationStorageController,
    Driver = Migrations.Driver,
    Configuration = Migrations.Configuration,
    dbPath = 'mongodb://' + serverName + ':' + port + '/' + dbName,
    support = require('./DataBaseMigrationSpec-Support.js')(dbPath),
    exec = require('child_process').exec,
    mongojs = require('mongojs'),
    migrationFolderName = 'scripts';

// Specify the default timeout
jasmine.getEnv().defaultTimeoutInterval = 80000;


/* ---- Begin Tests ---- */
describe("test core functionality of migration tool",function() {
    it('test MigrationStorageController', function(done) {
        var db = mongojs(dbPath);
        self.db = db;

        var removeMigrations = function () {
            var storage = new MigrationStorageController(db);

            storage.getFirstMigrationEntry(function(err, object) {
                expect(err).toBeFalsy();

                if (object !== null) {
                    var m = object;
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

                setTimeout(function () {
                    storage.getFirstMigrationEntry(function (err, m) {
                        expect(err).toBeFalsy();
                        expect(m).toBeTruthy();
                        expect(m.title.split('-')[1]).toBe('test0');

                        storage.getLastMigrationEntry(function(err, m) {
                            expect(err).toBeFalsy();
                            expect(m).toBeTruthy();
                            expect(m.title).toBe(cur  + '-' + 'test' + i);

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
                }, 100);


            });
        };

        var storage = new MigrationStorageController(db);
        storage.hasMigrationStorage(function (err, exists) {
            expect(err).toBeFalsy();

            storage.createMigrationStorage(function (err, collection) {
                expect(err).toBeFalsy();

                storage.hasMigrationStorage(function (err, exists) {
                    expect(err).toBeFalsy();

                    runTests(0);
                });

            });
        });

    });

    it('using the command line', function (done) {
        support.runCreate({ migrationName: 'test1', callback: function() {
            exec("node ../bin/airspring-migrate.js --config ../default-config.js up", function (error, stdout, stderr) {
                expect(error).toBeFalsy();

                exec("node ../bin/airspring-migrate.js --config ../default-config.js down", function (error, stdout, stderr) {
                    expect(error).toBeFalsy();

                    done();
                });
            });
        }});
    });

    it('using programmatic migrations and extension of driver and config files', function (done) {
        var config = new Configuration({
            connectionOptions: {
                host : "localhost",
                port: 27017,
                db   : "app-db2"
            }
        });


        var runCreateModule = function (i) {
            var options = {
                config: config,
                command: 'create',
                args: ['test' + i]
            };

            if (i < 4) {
                Migrations.run(options, function (err) {
                    expect(err).toBeFalsy();
                    expect(support.fileExists('./' + migrationFolderName, '^(\\d{17}[-])test'  + i +  '.js')).toBe(true);

                    runCreateModule(++i);
                });
            } else {
                options = {
                    config: config,
                    args: []
                };

                Migrations.run(options, function (err) {
                    expect(err).toBeFalsy();

                    options = {
                        config: config,
                        command: 'down',
                        args: []
                    };
                    Migrations.run(options, function (err) {
                        expect(err).toBeFalsy();
                        done();
                    });
                });
            }
        };

        runCreateModule(0);
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