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
    client.db(config.dbName).collection('users')
    .findOne({login: req.session.user})
    .then(function(user) {
      if (err) { client.close(); return next(err); }
      req.user = res.locals.user = user;
      req.userName = res.locals.userName = user.name;
      req.userRole = res.locals.userRole = user.role;

      var sourceName = '-?-';
      client.db(config.dbName).collection('chiefs')
      .find({steward: res.locals.userName})
      .toArray(function(err, departs) {
        if (user.role == 'booker') {
          aggregate = [ {$group: {_id: {source: "$_id.source"}, contractCount: {$sum: 1}}} ]
        } else {
          // договора где пользователь - руководитель
          var scopeSteward = [ { "_id.steward": { $eq: res.locals.userName } } ];
          // договора всех подразделений где пользователь - руководитель
          for (var i = 0; i < departs.length; i++) {
            scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
          }
          aggregate = [ {$match: {$or: scopeSteward}},
          {$group: {_id: {source: "$_id.source"}, contractCount: {$sum: 1}}} ]
        }
        client.db(config.dbName + res.locals.year).collection('contracts')
        .aggregate(aggregate)
        .toArray(function(err, list_counts){
          if (err) return next(err);
          client.db(config.dbName + res.locals.year).collection('sources').find({})
          .toArray(function(err, list_sources){
            if (err) return next(err);
            client.close();
            for (var i = 0; i < list_sources.length; i++) {
              list_sources[i].contractCount = 0;
              var mask = RegExp('^'+list_sources[i]._id)
              for (var j = 0; j < list_counts.length; j++) {
                if (list_counts[j]._id.source.match(mask)) {
                  list_sources[i].contractCount += list_counts[j].contractCount;
                }
              }
            }
            var sourceList = [];
            for (var i = 0; i < list_sources.length; i++) {
              if (list_sources[i]._id === res.locals.source_code) sourceName = list_sources[i].name;
              if (list_sources[i].contractCount) {
                sourceList.push( { 
                  code: list_sources[i]._id, 
                  name: list_sources[i].name,
                  contractCount: list_sources[i].contractCount
                } );
              }
            }
            res.locals.source_name = sourceName || '-?-';
            res.locals.source_list = sourceList || [];
            next();
          });
        });
      });
    });
  });
};
