const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.steward_list = function(req, res, next) {
  // Только данного ответственного если role == 'master'
  var match = {role: 'master'};
  if (req.user.role == 'master') {
    match = { _id: req.user._id } ;
  }
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('stewards').find(match)
    .toArray(function (err, list_stewards) {
      client.close();
      if (err) { return next(err); }
      res.render('report/steward_list', { 
        title: 'Ответственные', 
        steward_list: list_stewards
      });
    });
  });
};

exports.steward_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('contracts').find({ steward: req.params.id}).sort( {_id: 1} )
      .toArray(function (err, list_contracts) {
        client.close();
        if (err) { return next(err); }
        res.render('report/steward_detail', { 
          title: 'Ответственный ' + req.params.id, 
          steward: req.params.id, 
          contract_list: list_contracts 
        });
      });
  });
};
