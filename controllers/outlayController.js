const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('eclasses')
    .find({"_id.eCode": req.params.eclass})
    .toArray(function (err, list_eclasses) {
      if (err) { return next(err); }
      var eclass = list_eclasses[0];
      db.collection('contracts')
      .find({_id: req.params.contract})
      .toArray(function (err, list_contracts) {
        if (err) { return next(err); }
        var contract = list_contracts[0];
        db.collection('outlays')
        .find({eclass: req.params.eclass, contract: req.params.contract} ) 
        .sort({date: -1})
        .toArray(function (err, list_outlays) {
          if (err) { return next(err); }
          var node = contract.department;
          var depsId = [];
          var nl = 6;
          while (nl <= node.length) {
            depsId.push(node.slice(0, nl));
            nl += 6;
          }
          var list_departments = [];
          async.eachSeries(depsId, 
            function(dep_id, callback) {
              db.collection('departments')
              .find({_id: dep_id})
              .toArray(function (err, departments) {
                if (err) { return next(err); }
                var department = departments[0];
                list_departments.push({ 
                  url: department.url,
                  name: department.code + ' ' + department.abbr
                });
                callback(null);
              });
            }, 
            function() {
              client.close();
              res.render('report/outlay_list', {
                contract: contract,
                eclass: eclass,
                steward: { 
                  url: '/report/steward/'.concat(encodeURIComponent(contract.steward)), 
                  _id: contract.steward 
                },
                department_list: list_departments,
                outlay_list: list_outlays
              });
            }
          );
        });
      });
    });
  });
}
