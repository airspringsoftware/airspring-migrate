#airspring-migrate
=============

Built with a starting framework from: https://github.com/visionmedia/node-migrate, and https://github.com/afloyd/mongo-migrate.git


## Installation
	$ npm install -g git+https://github.com/airspringsoftware/airspring-migrate.git
	
##Usage
```
Usage: airspring-migrate [options] [command]

Options:
	-c, --chdir <path>				Change the working directory (if you wish to store your migrations outside of this folder
	-cfg, --config <filename>		DB config file name
	--dbn, --dbPropName <string>		Property name for the database connection in the config file. The configuration file should 
									contain something like 
									{ 	
										appDb : { //appDb would be the dbPropName
											host: 'localhost', 
											db: 'mydbname',
											//port: '27017' //include a port if necessary
										}
									}
	
Commands:
	down [revision]		migrate down (stop at optional revision name/number)
	up [revision]		migrate up (stop at optional revision name/number)
	create [title]		create a new migration file with optional [title]
```

##Creating Migrations
To create a migration execute with `node airspring-migrate create` and optionally a title. airspring-migrate will create a node module within `./migrations/` which contains the following two exports:
```
var mongodb = require('mongodb');

exports.up = function (resources, next) {
    var db = resources.db,
        mongojs = resources.mongojs;

	next();
};

exports.down = function (resources. next) {
    var db = resources.db,
        mongojs = resources.mongojs;

	next();
}
```

All you have to do is populate these, invoking `next()` when complete, and you are ready to migrate! If you detect an error during the `exports.up` or `exports.down` pass next(err) and the migration will attempt to revert the opposite direction. If you're migrating up and error, it'll try to do that migration down.

For example:

```
	$ airspring-migrate create add-pets
	$ airspring-migrate create add-owners
```

The first call creates `./migrations/{timestamp in milliseconds)-add-pets.js`, which we can populate:
```
exports.up = function (db, next) {
	var pets = mongodb.Collection(db, 'pets');
	pets.insert({name: 'tobi'}, next);
};

exports.down = function (db, next) {
	var pets = mongodb.Collection(db, 'pets');
	pets.findAndModify({name: 'tobi'}, [], {}, { remove: true }, next);
};
```

The second creates `./migrations/{timestamp in milliseconds}-add-owners.js`, which we can populate:
```
	exports.up = function(db, next){
		var owners = mongodb.Collection(db, 'owners');
		owners.insert({name: 'taylor'}, next);		
    };

	exports.down = function(db, next){
		var owners = mongodb.Collection(db, 'owners');
		pets.findAndModify({name: 'taylor'}, [], {}, { remove: true }, next);
	};
```

## Running Migrations
When first running the migrations, all will be executed in sequence.

```
	airspring-migrate
	up : migrations/1385138999835-add-pets.js
	up : migrations/1385139017040-add-owners.js
	migration : complete
```

Subsequent attempts will simply output "complete", as they have already been executed on the given database. `airspring-migrate` knows this because it stores migrations already run against the database in the `migrations` collection.
```
	$ airspring-migrate
	migration : complete
```

If we were to create another migration using `airspring-migrate create coolest-owner`, and then execute migrations again, we would execute only those not previously executed:
```
	$ airspring-migrate
	up : migrations/1385139017041-coolest-owner
```

If we were to then migrate using `airspring-migrate down 5`. This means to run from current revision, which in this case would be `0015-coolecst-owner`, down to revision number 5. Note that you can use either the revision number, or then full revision name `0005-add-pets`
```
	$ airspring-migrate down 5
	down : migrations/1385139017041-coolest-owner
	down : migrations/1385139017040-add-owners
```

## Configuration
### Working Directory
The options for connecting to the database are read in from a file. You can configure where the file is read in from and where the migration directory root is by the `-c <path>` option.
```
	$ airspring-migrate -c ../.. up
	migration : complete
```
This would set the working directory two levels above the airspring-migrate directory, such as if you included it into another project and it was nested in the node_modules folder.

### Config filename
The default configuration filename is `default-config.js`. If you wish to use a different filename, use the `-cfg <filename>` option:
```
	$ airspring-migrate -cfg my-config.json up
	migration : complete
```

### Config file property name
Inside the configuration file, airspring-migrate expects the database connection information to be nested inside an object. The default object name is `connectionOptions`. If you wish to change this you can use the `-dbn <string>` option:
```
	$ airspring-migrate -dbn dbSettings up
	migration : complete
```
This would tell airspring-migrate your config file looks something like:
```
	{
		dbSettings: {
			host: 'localhost',
			db: 'myDatabaseName',
			//port: 27017 //Specifying a port is optional
		}
	}
```


All of these settings can be combined as desired, except for the up/down obviously ;)














(The MIT License)

Copyright &copy; 2013 Austin Floyd &lt;austin.floyd@sparcedge.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


