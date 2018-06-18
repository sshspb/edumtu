const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;
  req.userName = res.locals.userName = null;
  req.userRole = res.locals.userRole = null;
  if (!req.session.user) return next();

  res.locals.variant = req.session.variant || "0";
  res.locals.scope = req.session.scope || "0";
  res.locals.source = req.session.source || "0";
  //console.log('--- loadUser --- req.session.source = ' + req.session.source);
  //console.log('--- loadUser --- res.locals.source = ' + res.locals.source);
  res.locals.variant_list = config.variant_list;
  res.locals.scope_list = config.scope_list;
  res.locals.estimate_index = config.estimate_index;

  MongoClient.connect(config.dbUrl, function(err, client) {
    var db = client.db(config.dbName);
    db.collection('users').findOne({login: req.session.user})
    .then(function(user) {
      if (err) { client.close(); return next(err); }
      req.user = res.locals.user = user;
      req.userName = res.locals.userName = user.name;
      req.userRole = res.locals.userRole = user.role;
      var source_list = [ { code: 0, name: 'Всё финансирование'}];
      db.collection('sources').find({ "_id.scope": res.locals.scope })
      .toArray(function(err, list_sources){
        client.close();
        if (err) return next(err);
        client.close();
        for (var i = 0; i < list_sources.length; i++) {
          source_list.push( { 
            code: i + 1, 
            name: list_sources[i]._id.source
          } );
        }
        res.locals.source_list = source_list;
        next();
      });
    });
  });
};
