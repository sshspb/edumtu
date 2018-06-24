const async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;
const titleKOSGU = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.contract_estimate_list = function(req, res, next) {
  // смета договора  url: /report/contract/:contract 
  const contract = req.params.contract;
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
      // смета договора
      db.collection('smeta')
      .find({ "_id.contract": contract })
      .sort({ "_id.eCode": 1})
      .toArray(function (err, list_estimates) {
        if (err) { return next(err); }
        // подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (list_estimates.length) {
          node = list_estimates[0].parent;
          steward = list_estimates[0].steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === list_estimates[0].source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // смета будет в таком виде
        var estimate_list = [];
        for (var i = 0; i < list_estimates.length; i++) {
          estimate_list.push({
            name: list_estimates[i]._id.eCode + " " + list_estimates[i]._id.eName,
            url: "/report/outlays/contract/" + encodeURIComponent(contract) + "/ecode/" + encodeURIComponent(list_estimates[i]._id.eCode),
            estimate: {
              remains: list_estimates[i].remains,
              plan: list_estimates[i].plan,
              income: list_estimates[i].income,
              outlayO: list_estimates[i].outlayO,
              outlay: list_estimates[i].outlay,
              balance: list_estimates[i].balance,
              balanceE: list_estimates[i].balanceE
            }
          })
        }
        // структура подразделения где выполняется договор
        var depsId = [];
        var nl = 5;
        while (nl <= node.length) {
          depsId.push(node.slice(0, nl));
          nl += 5;
        }
        var list_departments = [];
        async.eachSeries(depsId, 
          function(dep_id, callback) {
            db.collection('departments')
            .find({node: dep_id})
            .toArray(function (err, departments) {
              if (err) { return next(err); }
              // право доступа к информации по подразделению
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0].node.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? "/report/department/" + departments[0].node : "",
                name: departments[0].name
                });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              longTitle: longTitle(list_departments, contract, steward, sourceName),
              ecode: '',
              tabs: [
                { flag: true, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
              ],
              record_list: estimate_list,
              income_list: [],
              outlay_list: []
            });
          }
        );
      });
    });
  });
}

exports.contract_income_list = function(req, res, next) {
  // url /report/incomes/contract/:contract записи прихода по договору
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    // пользователь руководит подразделениями
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
      // сведения о договоре
      db.collection('contracts')
      .find({"_id.contract": req.params.contract})
      .toArray(function (err, contracts) {
        if (err) { return next(err); }
        var contract = contracts[0];
        var sourceName = '';
        for (var i = 0; i < res.locals.source_list.length; i++) {
          if (res.locals.source_list[i].code === contract._id.source) {
            sourceName = res.locals.source_list[i].name;
          }
        }
      // доходы по договору
        db.collection('incomes')
        .find({contract: req.params.contract})
        .sort({date: -1})
        .toArray(function (err, list_incomes) {
          if (err) { return next(err); }
          // структура подразделений договора
          var node = contract.parent, depsId = [], nl = 5;
          while (nl <= node.length) {
            depsId.push(node.slice(0, nl));
            nl += 5;
          }
          var list_departments = [];
          async.eachSeries(depsId, 
            function(dep_id, callback) {
              db.collection('departments')
              .find({node: dep_id})
              .toArray(function (err, departments) {
                if (err) { return next(err); }
                // право доступа к информации по подразделению
                var scopeChief = res.locals.userRole == 'booker' ? true : false;
                for (var k = 0; k < regexps.length; k++) {
                  if (departments[0].node.match(regexps[k])) {
                    scopeChief = true;
                  }
                }
                list_departments.push({ 
                  url: scopeChief ? "/report/department/" + departments[0].node : '',
                  name: departments[0].name
                });
                callback(null);
              });
            }, 
            function() {
              client.close();
              res.render('report/detail', {
                title: contract._id.contract,
                title1: titleKOSGU,
                longTitle: longTitle(list_departments, contract._id.contract, contract._id.steward, sourceName),
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
  });
}

exports.contract_outlay_list = function(req, res, next) {
  // /outlays/contract/:contract записи расхода по договору
  const contract = req.params.contract;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    // пользователь руководит подразделениями
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
      // записи расхода
      db.collection('outlays' + res.locals.variant)
      .find({contract: contract})
      .sort({date: -1, eCode: 1})
      .toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        // подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (list_outlays.length) {
          node = list_outlays[0].parent;
          steward = list_outlays[0].steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === list_outlays[0].source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // структура подразделения где выполняется договор
        var depsId = [];
        var nl = 5;
        while (nl <= node.length) {
          depsId.push(node.slice(0, nl));
          nl += 5;
        }
        var list_departments = [];
        async.eachSeries(depsId, 
          function(dep_id, callback) {
            db.collection('departments')
            .find({node: dep_id})
            .toArray(function (err, departments) {
              if (err) { return next(err); }
              // право доступа к информации по подразделению
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0].node.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? "/report/department/" + departments[0].node : '',
                name: departments[0].name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              longTitle: longTitle(list_departments, contract, steward, sourceName),
              ecode: '',
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
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

exports.contract_ecode_outlay_list = function(req, res, next) {
  // /outlays/contract/:contract/ecode/:ecode  записи расхода по договору по статье
  const ecode = req.params.ecode;
  const contract = req.params.contract;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    // пользователь руководит подразделениями
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
      // записи расхода
      db.collection('outlays' + res.locals.variant)
      .find({contract: contract, eCode: ecode})
      .sort({date: -1})
      .toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        // подразделение, руководитель, видДеятельности договора
        var node = '', steward = '', sourceName = '';
        if (list_outlays.length) {
          node = list_outlays[0].parent;
          steward = list_outlays[0].steward;
          for (var i = 0; i < res.locals.source_list.length; i++) {
            if (res.locals.source_list[i].code === list_outlays[0].source) {
              sourceName = res.locals.source_list[i].name;
            }
          }
        }
        // структура подразделения где выполняется договор
        var depsId = [];
        var nl = 5;
        while (nl <= node.length) {
          depsId.push(node.slice(0, nl));
          nl += 5;
        }
        var list_departments = [];
        async.eachSeries(depsId, 
          function(dep_id, callback) {
            db.collection('departments')
            .find({node: dep_id})
            .toArray(function (err, departments) {
              if (err) { return next(err); }
              // право доступа к информации по подразделению
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0].node.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? "/report/department/" + departments[0].node : '',
                name: departments[0].name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: contract,
              title1: titleKOSGU,
              longTitle: longTitle(list_departments, contract, steward, sourceName),
              ecode: ecode,
              tabs: [
                { flag: false, href: "/report/contract/" + encodeURIComponent(contract)},
                { flag: false, href: "/report/incomes/contract/" + encodeURIComponent(contract)},
                { flag: true, href: "/report/outlays/contract/" + encodeURIComponent(contract)}
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

function longTitle(list_departments, contract, steward, sourceName) {
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
      contract + '</span>; &nbsp;вид деятельности:&nbsp; ' +  sourceName +
      '; &nbsp;ответственный:&nbsp; <a href="/report/steward/' + 
      encodeURIComponent(steward) + '">' + steward + '</a>';
  return longTitle;  
}
