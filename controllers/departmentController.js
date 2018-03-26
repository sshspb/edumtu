var async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.department_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments').find()
    .sort({_id: 1})
    .toArray(function (err, list_departments) {
      client.close();
      if (err) { return next(err); }
      for (var i = 0; i < list_departments.length; i++) {
        var trClass = 'treegrid-'.concat(list_departments[i]._id);
        if (list_departments[i].parent) 
          trClass += ' treegrid-parent-'.concat(list_departments[i].parent);
        list_departments[i].trClass = trClass;
      }
      res.render('report/department_list', { 
        title: 'Подразделения', 
        department_list: list_departments
      });
    });
  });
}

exports.department_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
  db = client.db(config.dbName);
  db.collection('contracts')
  .find({department: RegExp('^' + req.params.id)})
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
        if (err) { return next(err); }
        longTitle = 'Подразделение';
        for (var i = 0; i < list_departments.length-1; i++) {
          longTitle += ' / <a href="'+list_departments[i].url+'">' + list_departments[i].name +'</a>';
        }
        longTitle += ' / <span style="font-weight: 700;">' + list_departments[list_departments.length-1].name + '</span>';

        res.render('report/department_detail', { 
          title: 'Подразделение ' + list_departments[list_departments.length-1].name,
          longTitle: longTitle,
          contract_list: list_contracts
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

/*
exports.department_detail = function(req, res, next) {
  //var like = RegExp('^' + req.params.id);
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('departments').find({_id: req.params.id})
    .toArray(function (err, list_departments) {
      if (err) { return next(err); }
      var department = list_departments[0];
      db.collection('contracts').aggregate([
        { $match: { department: RegExp('^' + req.params.id)}},
        { $sort: { _id: 1} }
      ])
      .toArray(function (err, list_contracts) {
        client.close();
        if (err) { return next(err); }
        res.render('report/department_detail', { 
          title: 'Подразделение ' + department.code + ' ' + department.abbr, 
          contract_list: list_contracts
        });
      })
    })
  })
};
*/
