exports.up = function(dbContext, next){
    var db = dbContext.resources.db,
        mongodb = dbContext.resource.mongodb;

    next();
};

exports.down = function(dbContext, next){
    var db = dbContext.resources.db,
        mongodb = dbContext.resources.mongodb;

    next();
};
