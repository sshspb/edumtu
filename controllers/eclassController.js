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
        title: 'План', 
        eclass_list: list_eclasses
      });
    });
  })
};

exports.eclass_detail = function(req, res) {
    res.send('NOT IMPLEMENTED: eclass detail: ' + req.params.id);
};
