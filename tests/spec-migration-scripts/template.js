exports.up = function(dbContext, next){
    var dbDriver = dbContext.dbDriver,
        connection = dbContext.connection,
        mongodb = dbContext.requirements.mongodb,
        airspring = dbContext.requirements.airspring;

    next();
};

exports.down = function(dbContext, next){
    var dbDriver = dbContext.dbDriver,
        connection = dbContext.connection,
        mongodb = dbContext.requirements.mongodb,
        airspring = dbContext.requirements.airspring;

    next();
};
