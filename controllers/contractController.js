const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;

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
            var node = contract.parent;
            var depsId = [];
            var nl = 6;
            while (nl <= node.length) {
              depsId.push(node.slice(0, nl));
              nl += 6;
            }
            depsId.shift();
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
                    name: department.name
                  });
                  callback(null);
                });
              }, 
              function() {
                client.close();
                var longTitle = 'Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>';
                for (var i = 0; i < list_departments.length; i++) {
                  longTitle += ' / <a href="'+list_departments[i].url+'">' + list_departments[i].name +'</a>';
                }
                longTitle += ' / Договор <span style="font-weight: 700;">' + contract.name + '</span>, Ответственный ' + 
                    '<a href="'+'/report/steward/' + encodeURIComponent(contract.steward) + '">' + contract.steward +'</a>';
                res.render('report/contract_detail', {
                  longTitle: longTitle,
                  title: 'КОСГУ', 
                  record_list: list_estimates,
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
