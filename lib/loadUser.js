const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;
  req.userName = res.locals.userName = null;
  req.userRole = res.locals.userRole = null;
  if (!req.session.user) return next();

  res.locals.variant = req.session.variant || "0";
  res.locals.scope = req.session.scope || "0";
  res.locals.source_code = req.session.source || "0";
  res.locals.variant_list = config.variant_list;
  res.locals.estimate_index = config.estimate_index;

  MongoClient.connect(config.dbUrl, function(err, client) {
    var db = client.db(config.dbName);
    db.collection('users').findOne({login: req.session.user})
    .then(function(user) {
      if (err) { client.close(); return next(err); }
      req.user = res.locals.user = user;
      req.userName = res.locals.userName = user.name;
      req.userRole = res.locals.userRole = user.role;

      var sourceName = '-?-';
      var sourceList = [];
      db.collection('sources').find({})
      .toArray(function(err, list_sources){
        client.close();
        if (err) return next(err);
        for (var i = 0; i < list_sources.length; i++) {
          if (list_sources[i]._id === res.locals.source_code) {
            sourceName = list_sources[i].name;
          }
          sourceList.push( { 
            code: list_sources[i]._id, 
            name: list_sources[i].name
          } );
        }
        res.locals.source_name = sourceName;
        res.locals.source_list = sourceList;

        next();
      });
    });
  });
};
