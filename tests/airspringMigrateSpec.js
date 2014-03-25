var Migrations = require('../'),
    AirspringMigratiton = Migrations.AirspringMigration,
    MigrationStorageController = Migrations.MigrationStorageController,
    _ = require('underscore'),
    path = require('path'),
    Configuration = Migrations.Configuration,
    config = new Configuration(),
    dbPath = 'mongodb://' + config.host + ':' + config.port + '/' + config.db,
    exec = require('child_process').exec,
    mongojs = Migrations.mongojs,
    migrationFolderName = 'scripts',
    db = new mongojs(dbPath),
    storage = new MigrationStorageController(db),
    runCommand = 'node ../bin/airspring-migrate.js --config ../default-config.js --silent',
    scriptFolder = 'scripts',
    support = new Migrations.MigrationSpecSupport(scriptFolder, runCommand);

// Specify the default timeout
jasmine.getEnv().defaultTimeoutInterval = 80000;

/* ---- Begin Tests ---- */
describe('test MigrationStorageController', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });

    it ('has the ability to check for and create a storage container', function (done) {
        support.testMigrationControllerStorageCreation(storage, done);
    });

    it ('ability to create and remove migrations from the storage container', function (done) {
        support.testMigrationControllerCanAddAndRemoveMigrations(storage, done);
    });
});

describe('test command line functionality,', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });


    var testMigrations = ['test1', 'test2', 'test3'];
    var createMigrations = function (i, complete) {
        if (_.isFunction(i)) {
            complete = i;
            i = 0;
        }

        if (i < testMigrations.length) {
            var migrationName = testMigrations[i];
            support.runCreate({
                migrationName: migrationName,
                migrationScript: support.fetchTemplate(migrationName),
                callback: function () {
                    setTimeout(function () {
                        createMigrations(++i, complete);
                    }, 1000);
                }
            });
        } else {
            setTimeout(complete, 10);
        }
    };

    var checkInitialConditions = function (complete) {
        var afterExists = _.after(testMigrations.length, complete);
        _.each(testMigrations, function (migrationName) {
            db.exists(migrationName, function (err, exists) {
                expect(err).toBeFalsy();
                expect(exists).toBe(false);
                afterExists();
            });
        });
    };

    it("create generates a migration file according the specified template on the command line", function (done) {
        support.runCreate({ 'migrationName': 'template', 'callback': done });
    });

    it("migrations can be ran up and down using multiple migration files", function (done) {
        function testMigrateUp(complete) {
            // Run the migration
            exec(runCommand + ' up', function (error, stdout, stderr) {
                if (error) console.error(error);
                if (stderr) console.error(stderr);

                expect(error).toBeFalsy();
                expect(stderr).toBeFalsy();

                var afterExists = _.after(testMigrations.length, complete);
                _.each(testMigrations, function (migrationName) {
                    db.exists(migrationName, function (err, exists) {
                        expect(err).toBeFalsy();
                        expect(exists).toBe(true);
                        afterExists();
                    });
                });
            });
        }

        function testMigrateDown (complete) {
            exec(runCommand + ' down', function (error, stdout, stderr) {
                expect(error).toBeFalsy();
                expect(stderr).toBeFalsy();
                complete();
            });
        }

        createMigrations(function () {
            // Check the initial db conditions
            checkInitialConditions(function () {
                // Run the migrations up and test
                testMigrateUp(function () {
                    // Run the migrations down and test
                    testMigrateDown(done);
                });
            });
        });
    });

    it('migrations can be ran up to specific migration number', function (done) {
        createMigrations(function () {
            checkInitialConditions(function () {

                var testFile = support.getFiles('./' + scriptFolder, '^(\\d{14}[-])' + 'test2' + '.js')[0];
                var migrationMiddle = path.basename(testFile, '.js');

                exec(runCommand + ' up ' + migrationMiddle, function(error, stdout, stderr) {
                    expect(error).toBeFalsy();
                    expect(stderr).toBeFalsy();

                    storage.getAllMigrationEntries(function (err, migrations) {
                        expect(err).toBeFalsy();
                        expect(migrations.length).toBe(2);

                        db.exists('test1', function (err, exists) {
                            expect(err).toBeFalsy();
                            expect(exists).toBe(true);

                            db.exists('test2', function (err, exists) {
                                expect(err).toBeFalsy();
                                expect(exists).toBe(true);

                                db.exists('test3', function (err, exists) {
                                    expect(err).toBeFalsy();
                                    expect(exists).toBe(false);
                                    done();
                                });
                            });
                        });
                    });


                });



            });
        });
    });
});


describe('test programmatic functionality', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });

    it('using programmatic migrations and extension of driver and config files', function (done) {
        var migration = new AirspringMigratiton({
            config: config,
            silent: true
        });

        var runCreateModule = function (i) {
            if (i < 4) {
                migration.run('create', ['test' + i], false, function (err) {
                    expect(err).toBeFalsy();
                    expect(support.fileExists('./' + migrationFolderName, '^(\\d{14}[-])test'  + i +  '.js')).toBe(true);
                    runCreateModule(++i);
                });
            } else {
                migration.run('up', [] , false, function (err) {
                    expect(err).toBeFalsy();
                    migration.run('down', [], false, function (err) {
                        expect(err).toBeFalsy();
                        done();
                    });
                });
            }
        };

        runCreateModule(0);
    });

});


function runAfterEach (done) {
    support.dbFSCleanUp({
        rootPath: './',
        dbName: config.db,
        resetFileSystem: true,
        complete: function (err, response) {
            if (err) console.error(err);
            done();
        }
    });
}

