var collectionName = 'test2';

exports.up = function(resources, next){
    var db = resources.db;

    var mycollection = db.collection(collectionName);
    mycollection.save({ title: 'doc1' }, function (err) {
        if (err) return next(err);
        next();
    });
};

exports.down = function(resources, next){
    var db = resources.db;

    var mycollection = db.collection(collectionName);
    mycollection.drop(function (err) {
        if (err) return next(err);
        next();
    });
};