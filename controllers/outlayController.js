const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;

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

              var longTitle = scope_list[res.locals.scope];
              for (var i = 0; i < list_departments.length; i++) {
                longTitle += ' / <a href="'+list_departments[i].url+'">' + list_departments[i].name +'</a>';
              }
              longTitle += ' / Договор <span style="font-weight: 700;">' + contract.name + '</span>, Ответственный ' + 
                  '<a href="'+'/report/steward/' + encodeURIComponent(contract.steward) + '">' + contract.steward +'</a>';
              var note = 'Исполнено по статье КОСГУ <span style="font-weight: 700;">' + 
                          eclass._id.eCode + ' ' + eclass._id.eName + '</span>';

              res.render('report/outlay_list', {
                title: contract.name + '/' + eclass._id.eCode, 
                note: note,
                longTitle: longTitle,
                eclass: eclass,
                outlay_list: list_outlays
              });
            }
          );
        });
      });
    });
  });
}
