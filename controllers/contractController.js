const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.contract_list = function(req, res, next) {
  var match = {};
  if (req.user.role == 'master')  match = { steward: req.user._id };
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('contracts').aggregate([
      { $match: match},
      { $sort: { _id: 1} }
    ]).toArray(function(err, list_contracts) {
      client.close();
      if (err) { return next(err); }
      var listLength = list_contracts.length;
      for (var i = 0; i < listLength; i++) {
        list_contracts[i].url = '/report/contract/' + encodeURIComponent(list_contracts[i]._id);
        list_contracts[i].steward_url = '/report/steward/' + encodeURIComponent(list_contracts[i].steward);
      }
      res.render('report/contract_list', { 
        title: 'Договоры', 
        contract_list: list_contracts
      });
    });
  });
};

exports.contract_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('contracts')
    .find({_id: req.params.id})
    .toArray(function (err, contracts) {
      if (err) { return next(err); }
      var contract = contracts[0];
      db.collection('estimates')
      .find({"_id.contract": contract._id})
      .toArray(function (err, list_estimates) {
        if (err) { return next(err); }
        db.collection('incomes')
        .find({contract: contract._id}).sort({date: -1})
        .toArray(function (err, list_incomes) {
          if (err) { return next(err); }
          db.collection('outlays')
          .find({contract: contract._id}).sort({date: -1})
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
                res.render('report/contract_detail', {
                  title: 'Договор ' + contract._id, 
                  contract: contract,
                  steward: { 
                    url: '/report/steward/'.concat(encodeURIComponent(contract.steward)), 
                    _id: contract.steward 
                  },
                  department_list: list_departments,
                  estimate_list: list_estimates,
                  income_list: list_incomes,
                  outlay_list: list_outlays
                });
              }
            );
          });
        });
      });
    });
  });
}
