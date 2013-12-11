/**
 * DatabaseMigrationSpec-Support.js
 * Spreads out some of the supporting functions used in the DataBaseMigrationSpec to keep the spec purely tests
 */
/* Requirements */
var fs = require('fs'),
    mongodb = require('mongodb'),
    _ = require('underscore');
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

    var resetDataBase = function (done) {
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

                // Drop the collections created from the test if they exist
                dropIfExists('migrations', function() {
                    dropIfExists('airspring.applications', function() {
                        dropIfExists('DataDictionary', function() {
                            dropIfExists('airspring.LogicDictionary', function() {
                                dropIfExists('airspring.referenceTrees', function() {
									dropIfExists('airspring.DataDictionary', function() {
										done()
									});
                                });
                            });
                        });
                    });
                });
            }
        });
    };

	var fetchTemplate = function (templateName) {
		return fs.readFileSync('./spec-migration-scripts/' + templateName + '.js', 'utf8');
	};

    var obj = {
        'afterEach': function (done) {
            resetFileSystem();
            resetDataBase(done);
        },
        'fileExists': fileExists,
        'getFiles': getFiles,
		'fetchTemplate': fetchTemplate
    };

    return obj;
};