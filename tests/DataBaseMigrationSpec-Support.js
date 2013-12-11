/**
 * DatabaseMigrationSpec-Support.js
 * Spreads out some of the supporting functions used in the DataBaseMigrationSpec to keep the spec purely tests
 */
/* Requirements */
var fs = require('fs'),
    mongodb = require('mongodb'),
    _ = require('underscore'),
    exec = require('child_process').exec;

/* Extend Db to give it an exists function so we can determine if a collection exists */
_.extend(mongodb.Db.prototype, {
    'exists': function (collectionName, callback) {
        this.collectionsInfo(collectionName).toArray(function (err, items) {
            if (typeof callback === 'function') {
                callback(err, items.length > 0);
            }
        });
    }
});

module.exports = function (dbPath) {
    /* Takes a path and regex expression and returns files matching the patter at the specified path */
    var getFiles = function (path, regex) {
        var files  = fs.readdirSync(path);

        var matches = files.filter(function (fileName) {
            return new RegExp(regex, 'i').test(fileName);
        });

        return matches;
    };

    /* Checks if a files matching the specified regex pattern exists at the specified path */
    var fileExists = function (path, regex) {
        var matches = getFiles(path, regex);
        return matches && matches.length > 0;
    };

    var resetFileSystem = function () {
        // Reset file system
        var files = getFiles('./migrations', '^(\\d{13}[-]).*\\.js');
        _.each(files, function(element, index, list){
            fs.unlink('./migrations/' + element, function(err){
                if (err) {
                    console.log('Error removing ./migrations/' + element + ': ' + error);
                }
            });
        });
    };

    var resetDataBase = function (collectionsToRemove, done) {
        // Reset test database
        mongodb.MongoClient.connect(dbPath, function(err, db) {
            if(err) {
                console.log('Error connecting to db: ' + err);
            } else {
                var dropIfExists = function(collectionName, callback) {
                    db.exists(collectionName, function (err, exists) {
                        if (exists){
                            db.dropCollection(collectionName, function(err, result) {
                                if (err) console.log('Error dropping ' + collectionName + ': ' + err);
                                if (typeof callback === 'function') callback();
                            });
                        } else {
                            if (typeof callback === 'function') callback();
                        }
                    });
                };

                if (collectionsToRemove && collectionsToRemove.length > 0) {
                    var dropCollections = function(i) {
                        if (i < collectionsToRemove.length) {
                            dropIfExists(collectionsToRemove[i], function() {
                                dropCollections(++i);
                            });
                        } else {
                            done();
                        }
                    }

                    dropCollections(0);
                } else {
                    done();
                }
            }
        });
    };

	var fetchTemplate = function (templateName) {
		return fs.readFileSync('./spec-migration-scripts/' + templateName + '.js', 'utf8');
	};

    var writeMigrationFile = function (migrationName, migrationScript, callback) {
        var testFile = support.getFiles('./migrations', '^(\\d{13}[-])' + migrationName + '.js')[0];
        fs.writeFile('./migrations/' + testFile, migrationScript, function(err){
            expect(err).toBeFalsy();
            callback();
        });
    }

    /* options { migrationName, callback, [migrationScript] } */
    var runCreate = function(options) {
        exec('airspring-migrate create --config ../default-config.js ' + options.migrationName, function (error, stdout, stderr) {
            expect(error).toBeFalsy();

            // Check that the create command produced a file
            expect(fileExists('./migrations', '^(\\d{13}[-])' + options.migrationName + '.js')).toBe(true);

            var testFile = getFiles('./migrations', '^(\\d{13}[-])' + options.migrationName + '.js')[0],
                path = './migrations/' + testFile;

            fs.readFile(path, 'utf8', function(err, data) {
                expect(err).toBeFalsy();

                // Check that the file created matches the template
                expect(data).toBe(fetchTemplate('template'));

                if (typeof options.migrationScript	=== 'undefined') {
                    options.callback();
                } else {
                    writeMigrationFile(options.migrationName, options.migrationScript, options.callback);
                }
            });
        });
    };

    var obj = {
        afterEach: function (collectionsToRemove, done) {
            resetFileSystem();
            resetDataBase(collectionsToRemove, done);
        },
        fileExists: fileExists,
        getFiles: getFiles,
		fetchTemplate: fetchTemplate,
        runCreate: runCreate
    };

    return obj;
};