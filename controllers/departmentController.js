var async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;

exports.department_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments')
    .find({ scope: {$eq: res.locals.scope} })
    .sort({_id: 1})
    .toArray(function (err, list_departments) {
      if (err) { return next(err); }
      for (var i = 0; i < list_departments.length; i++) {
        var trClass = 'treegrid-'.concat(list_departments[i]._id);
        if (list_departments[i].parent) 
          trClass += ' treegrid-parent-'.concat(list_departments[i].parent);
        list_departments[i].trClass = trClass;
        list_departments[i].stewardUrl = null;
      }
      res.render('report/tree_list', {
        longTitle: 'Деятельность: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        title: 'Подразделение',
        record_list: list_departments
      });
    });
  });
}

exports.department_contract_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments')
    .find({ scope: {$eq: res.locals.scope} })
    .sort({_id: 1})
    .toArray(function (err, list_departments) {
      if (err) { return next(err); }
      var list_objects = []
      for (var i = 0; i < list_departments.length; i++) {
        var trClass = 'treegrid-'.concat(list_departments[i]._id);
        if (list_departments[i].parent) 
          trClass += ' treegrid-parent-'.concat(list_departments[i].parent);
        list_departments[i].trClass = trClass;
        list_objects.push(list_departments[i]);
        for (var j = 0; j < list_departments[i].contracts.length; j++) {
          list_objects.push({
            url: list_departments[i].contracts[j].url,
            name: list_departments[i].contracts[j]._id,
            steward: list_departments[i].contracts[j].steward,
            stewardUrl: '/report/steward/' + encodeURIComponent(list_departments[i].contracts[j].steward),
            trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-'.concat(list_departments[i]._id, ' contract '),
            estimate: list_departments[i].contracts[j].estimate
          });
        }
      }
      res.render('report/tree_list', {
        longTitle: 'Деятельность: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        title: 'Подразделение/Договор',
        title2: 'Руководитель',
        record_list: list_objects
      });

    });
  });
}

exports.department_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
  db = client.db(config.dbName);
  db.collection('contracts')
  .find({parent: RegExp('^' + req.params.id), "scope": {$eq: res.locals.scope}})
  .sort({ _id: 1})
  .toArray(function (err, list_contracts) {
    if (err) { return next(err); }
    var node = req.params.id;
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
          list_departments.push({ 
            url: departments[0].url,
            name: departments[0].name
          });
          callback(null);
        });
      }, 
      function() {
        client.close();
        if (err) { return next(err); }
        var longTitle = scope_list[res.locals.scope];
        for (var i = 0; i < list_departments.length-1; i++) {
          longTitle += ' / <a href="'+list_departments[i].url+'">' + list_departments[i].name +'</a>';
        }
        if (list_departments.length) 
          longTitle += ' / ' + list_departments[list_departments.length-1].name;

        res.render('report/department_detail', { 
          //longTitle: '<span style="font-weight: 700;">' + longTitle + '</span>',
          longTitle: longTitle,
          title: 'Договор',
          record_list: list_contracts
        });
      })
    })
  })
};

function rouble(n) {
  var x = n.toFixed(2).split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? ',' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ' ' + '$2');
  }
  return x1 + x2;
}
