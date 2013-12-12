var port = 27017,
    serverName = 'localhost',
    dbName = 'db-test',
    db = null,
    self = this;

var mongodb = require('mongodb'),
    Migrations = require('../'),
    MigrationStorageController = Migrations.MigrationStorageController,
    Driver = Migrations.Driver,
    Configuration = Migrations.Configuration,
    dbPath = 'mongodb://' + serverName + ':' + port + '/' + dbName,
    support = require('./DataBaseMigrationSpec-Support.js')(dbPath),
    exec = require('child_process').exec;

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

                    if (object !== null) {
                        var m = object;
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
                        expect(m).toBeTruthy();


                        console.log('First: ' + m.title.split('-')[1]);
                        expect(m.title.split('-')[1]).toBe('test0');

                        storage.getLastMigrationEntry(function(err, m) {
                            expect(err).toBeFalsy();
                            expect(m).toBeTruthy();

                            console.log('title: ' + m.title + '; ' + cur  + '-' + 'test' + i);
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

    it('using the command line', function (done) {
        support.runCreate({ migrationName: 'test1', callback: function() {
            exec("airspring-migrate --config ../default-config.js up", function (error, stdout, stderr) {
                expect(error).toBeFalsy();

                exec("airspring-migrate --config ../default-config.js down", function (error, stdout, stderr) {
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
                    expect(support.fileExists('./migrations', '^(\\d{13}[-])test'  + i +  '.js')).toBe(true);

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
                        config: config,
                        command: 'down',
                        args: []
                    };
                    Migrations.run(options, function (err) {
                        expect(err).toBeFalsy();
                        done();
                    });
                })
            }
        }
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