const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.eclass_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('eclasses').find({})
    .toArray(function (err, list_eclasses) {
      client.close();
      if (err) { return next(err); }
      res.render('report/eclass_list', { 
        title: 'Классификация операций сектора государственного управления', 
        record_list: list_eclasses
      });
    });
  })
};

exports.eclass_detail = function(req, res) {
    MongoClient.connect(config.dbUrl, function(err, client) {
      db = client.db(config.dbName);
       db.collection('outlays')
          .find({eclass: req.params.id} ) 
          .sort({date: -1})
          .toArray(function (err, list_outlays) {
            if (err) { return next(err); }
            res.render('report/eclass_detail', { 
              title: req.params.id, 
              outlay_list: list_outlays
            });
          });
        });
        
};
