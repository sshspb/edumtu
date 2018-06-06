const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;
const title1 = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.contract_estimate_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs){
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('contracts')
      .find({_id: req.params.contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        var contract = contracts[0];
        db.collection('estimates')
        .find({"_id.contract": req.params.contract})
        .sort( { "_id.eCode": 1 } )
        .toArray(function (err, list_estimates) {
          if (err) { return next(err); }
          var node = contract.parent;
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
                var scopeChief = res.locals.userRole == 'booker' ? true : false;
                for (var k = 0; k < regexps.length; k++) {
                  if (department._id.match(regexps[k])) {
                    scopeChief = true;
                  }
                }
                list_departments.push({ 
                  url: scopeChief ? department.url : '',
                  name: department.name
                });
                callback(null);
              });
            }, 
            function() {
              client.close();
              res.render('report/detail', {
                title: contract.name,
                title1: title1,
                longTitle: longTitle(list_departments, contract, scope_list[res.locals.scope]),
                ecode: '',
                tabs: [
                  { flag: true, href: "/report/contract/" + encodeURIComponent(req.params.contract)},
                  { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(req.params.contract)},
                  { flag: false, href: "/report/outlays/contract/" + encodeURIComponent(req.params.contract)}
                ],
                record_list: list_estimates,
                income_list: [],
                outlay_list: []
              });
            }
          );
        });
      });
    });
  });
}

exports.contract_income_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('contracts')
    .find({_id: req.params.contract})
    .toArray(function (err, contracts) {
      if (err) { return next(err); }
      var contract = contracts[0];
      db.collection('incomes')
      .find({contract: req.params.contract})
      .sort({date: -1})
      .toArray(function (err, list_incomes) {
        if (err) { return next(err); }
        var node = contract.parent;
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
                name: department.name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: contract.name,
              title1: title1,
              longTitle: longTitle(list_departments, contract, scope_list[res.locals.scope]),
              ecode: '',
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(req.params.contract)},
                { flag: true, href: "/report/incomes/contract/" + encodeURIComponent(req.params.contract)},
                { flag: false, href: "/report/outlays/contract/" + encodeURIComponent(req.params.contract)}
              ],
              record_list: [],
              income_list: list_incomes,
              outlay_list: []
            });
          }
        );
      });
    });
  });
}

exports.contract_outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
    
      db.collection('contracts')
      .find({_id: req.params.contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        var contract = contracts[0];
        db.collection('outlays' + res.locals.variant)
        .find({contract: req.params.contract})
        .sort({date: -1, eCode: 1})
        .toArray(function (err, list_outlays) {
          if (err) { return next(err); }
          var node = contract.parent;
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
                var scopeChief = res.locals.userRole == 'booker' ? true : false;
                for (var k = 0; k < regexps.length; k++) {
                  if (department._id.match(regexps[k])) {
                    scopeChief = true;
                  }
                }
                list_departments.push({ 
                  url: scopeChief ? department.url : '',
                  name: department.name
                });
                callback(null);
              });
            }, 
            function() {
              client.close();
              res.render('report/detail', {
                title: contract.name,
                title1: title1,
                longTitle: longTitle(list_departments, contract, scope_list[res.locals.scope]),
                ecode: '',
                tabs: [
                  { flag: false, href: "/report/contract/" + encodeURIComponent(req.params.contract)},
                  { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(req.params.contract)},
                  { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(req.params.contract)}
                ],
                record_list: [],
                income_list: [],
                outlay_list: list_outlays
              });
            }
          );
        });
      });
    });
  });
}

exports.contract_ecode_outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('contracts')
    .find({_id: req.params.contract})
    .toArray(function (err, contracts) {
      if (err) { return next(err); }
      var contract = contracts[0];
      db.collection('outlays' + res.locals.variant)
      .find({contract: req.params.contract, eCode: req.params.ecode})
      .sort({date: -1, eCode: 1})
      .toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        var node = contract.parent;
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
                name: department.name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: contract.name,
              title1: title1,
              longTitle: longTitle(list_departments, contract, scope_list[res.locals.scope]),
              ecode: req.params.ecode,
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(req.params.contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(req.params.contract)},
                { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(req.params.contract)}
              ],
              record_list: [],
              income_list: [],
              outlay_list: list_outlays
            });
          }
        );
      });
    });
  });
}

function longTitle(list_departments, contract, scope) {
  var longTitle = '&nbsp;Договор:&nbsp; ';
  for (var i = 0; i < list_departments.length; i++) {
    longTitle += ' <span style="color: #ccc">/</span> &nbsp;';
    if (list_departments[i].url) {
      longTitle += '<a href="' + list_departments[i].url + '">' + list_departments[i].name + '</a>';
    } else {
      longTitle += list_departments[i].name;
    }
  }
  longTitle += ' <span style="color: #ccc">/</span> &nbsp;&nbsp;<span style="font-weight: 700;">' + 
      contract.name + '</span>; &nbsp;вид деятельности:&nbsp; ' +  scope +
      '; &nbsp;ответственный:&nbsp; <a href="/report/steward/' + 
      encodeURIComponent(contract.steward) + '">' + contract.steward + '</a>';
  return longTitle;  
}
