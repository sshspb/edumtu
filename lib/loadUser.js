const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;
  req.userName = res.locals.userName = null;
  req.userRole = res.locals.userRole = null;

  var currentYear = new Date().getFullYear();
  dataYearList = [];
  for (var year = currentYear; year > 2016; year--) { 
      dataYearList.push( { name: year }); 
  }
  
  res.locals.okdata = req.session.okdata;
  res.locals.year = req.session.year || currentYear;
  res.locals.year_list = dataYearList || [{name: 2018}];
  res.locals.variant = req.session.variant || "0";
  res.locals.scope = req.session.scope || "0";
  res.locals.source_code = req.session.source || "0";
  res.locals.variant_list = config.variant_list;
  res.locals.estimate_index = config.estimate_index;
  res.locals.source_name = '-?-';
  res.locals.source_list = [];

  if (!req.session.user) return next();

  MongoClient.connect(config.dbUrl, function(err, client) {
    //var dbUser = client.db(config.dbName);
    client.db(config.dbName)
    .collection('users')
    .findOne({login: req.session.user})
    .then(function(user) {
      if (err) { client.close(); return next(err); }
      req.user = res.locals.user = user;
      req.userName = res.locals.userName = user.name;
      req.userRole = res.locals.userRole = user.role;

      var sourceName = '-?-';
      var sourceList = [];
      //var dbUser = client.db(config.dbName + res.locals.year);
      client.db(config.dbName + res.locals.year)
      .collection('sources')
      .find({})
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
        res.locals.source_name = sourceName || '-?-';
        res.locals.source_list = sourceList || [];
        next();
      });
    });
  });
};
