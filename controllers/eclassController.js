const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.eclass_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('eclasses').find({})
    .toArray(function (err, list_eclasses) {
      client.close();
      if (err) { return next(err); }
      /* for (var i = 0; i < list_eclasses.length; i++) {
        list_eclasses[i].name = list_eclasses[i]._id.eCode + ' ' + list_eclasses[i]._id.eName;
        list_eclasses[i].estimate = list_eclasses[i];
      } */
      res.render('report/eclass_list', { 
        //variant: req.variant,
        title: 'Классификация операций сектора государственного управления', 
        record_list: list_eclasses
      });
    });
  })
};

exports.eclass_detail = function(req, res) {
    res.send('NOT IMPLEMENTED: eclass detail: ' + req.params.id);
};
