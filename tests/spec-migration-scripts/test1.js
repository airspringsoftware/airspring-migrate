exports.up = function(dbContext, next){
	var dbDriver = dbContext.dbDriver,
		connection = dbContext.connection,
        mongodb = dbContext.requirements.mongodb,
        airspring = dbContext.requirements.airspring;

    try {
        var collection = new airspring.ApplicationCollection(),
            modelTest = new airspring.ApplicationModel();
        	collection.sync = dbDriver.sync;

        collection.add(modelTest);

        collection.save({
            saveAll: true,
            success: function() {
                console.log('Saved ' + modelTest.get('id'));

                next();
            },
            error: function(){
                console.log('error saving');
                next('error saving collection');
            }
        });
    } catch(ex) {
        next(ex);
    }
};

exports.down = function(dbContext, next){
	var dbDriver = dbContext.dbDriver,
		connection = dbContext.connection,
		 mongodb = dbContext.requirements.mongodb,
		 airspring = dbContext.requirements.airspring;

	try {
		 var collection = new airspring.ApplicationCollection();
		 collection.sync = dbDriver.sync;

		 collection.fetch({
			 'success': function() {
				 var destroysLeft = collection.length - 1,
					 len = collection.length,
					 save = function() {
						 console.log('saving');

					 collection.save({
						'saveAll': true,
						'success': function() {
							next();
						},
						'error': function() {
							next('error saving');
						}
					});
				};

				if (len === 0) save();

				for (var i = 0; i < len; i++)  {
					var model = collection.at(i);
					if (model) {
						var id = model.get('id');

						model.destroy({success: function() {
							console.log('removed ' + id);
						}});
					}

					if (destroysLeft === 0) {
						save();
					}

					destroysLeft--;
				}

			},
			'error': function(){
				next('Error fetching');
			}
		  });

	} catch (ex) {
		next(ex);
	}
};