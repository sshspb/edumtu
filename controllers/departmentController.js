var async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const titleKOSGU = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.department_contract_list = function(req, res, next) {
  // url: /report/departments_contracts
  const sourceName = res.locals.source_name;
  const sourceRegExp =  RegExp("^" + res.locals.source_code);
  MongoClient.connect(config.dbUrl, function(err, client) {
    // пользователь руководит подразделениями
    client.db(config.dbName)
    .collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs){
      if (err) { console.log(err); return next(err); }
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
      // подразделения, договора и их сметы
      client.db(config.dbName + res.locals.year)
      .collection('departments_contracts')
      .aggregate([
        { $lookup:
          { from: "departments_contracts",
            localField: "node",
            foreignField: "parent",
            as: "childrens"
          }
        },
        { $sort: { "node": 1} }
      ])
      .toArray(function(err, result) {
        if (err) { console.log(err); return next(err); }
        client.close();
        var mtuIndex = 0, scopeChief = false;
        for (var i = 0; i < result.length; i++) {
          result[i].estimate = {remains:0,plan:0,income:0,outlayO:0,outlay:0,balance:0,balanceE:0,balanceEM:0};
          if (result[i].parent == "") {
            mtuIndex = i;
          } else {
            scopeChief = false;
            if (res.locals.userRole == 'booker') {
              scopeChief = true;
            } else {
              // руководит подразделением
              for (var m = 0; m < regexps.length; m++) {
                if (result[i].node.match(regexps[m])) {
                    scopeChief = true;
                }
              }
            }
            result[i].visible = false;
            for (var j = 0; j < result[i].contracts.length; j++) {
              // итого сметы договоров непосредственного подчинения
              if (sourceRegExp.test(result[i].contracts[j].source) && 
                  (scopeChief || result[i].contracts[j].steward === res.locals.userName)) {
                result[i].estimate.remains += result[i].contracts[j].estimate.remains;
                result[i].estimate.plan += result[i].contracts[j].estimate.plan;
                result[i].estimate.income += result[i].contracts[j].estimate.income;
                result[i].estimate.outlayO += result[i].contracts[j].estimate.outlayO;
                result[i].estimate.outlay += result[i].contracts[j].estimate.outlay;
                result[i].estimate.balance += result[i].contracts[j].estimate.balance;
                result[i].estimate.balanceE += result[i].contracts[j].estimate.balanceE;
                result[i].estimate.balanceEM += result[i].contracts[j].estimate.balanceEM;
                result[i].contracts[j].visible = true;
                result[i].visible = true;
              } else {
                result[i].contracts[j].estimate = {remains:0,plan:0,income:0,outlayO:0,outlay:0,balance:0,balanceE:0,balanceEM:0};
                result[i].contracts[j].visible = false;
              }
            }
            for (var k = 0; k < result[i].childrens.length; k++) {
              result[i].childrens[k].estimate = {remains:0,plan:0,income:0,outlayO:0,outlay:0,balance:0,balanceE:0,balanceEM:0};
              scopeChief = false;
              if (res.locals.userRole == 'booker') {
                scopeChief = true;
              } else {
                // руководит подразделением
                for (var m = 0; m < regexps.length; m++) {
                  if (result[i].childrens[k].node.match(regexps[m])) {
                    scopeChief = true;
                  }
                }
              }
              for (var n = 0; n < result[i].childrens[k].contracts.length; n++) {
                // итого сметы договоров подразделения подчинённого (кафедры для факультета)
                if (sourceRegExp.test(result[i].childrens[k].contracts[n].source) && 
                    (scopeChief || result[i].childrens[k].contracts[n].steward === res.locals.userName)) {
                  result[i].estimate.remains += result[i].childrens[k].contracts[n].estimate.remains;
                  result[i].estimate.plan += result[i].childrens[k].contracts[n].estimate.plan;
                  result[i].estimate.income += result[i].childrens[k].contracts[n].estimate.income;
                  result[i].estimate.outlayO += result[i].childrens[k].contracts[n].estimate.outlayO;
                  result[i].estimate.outlay += result[i].childrens[k].contracts[n].estimate.outlay;
                  result[i].estimate.balance += result[i].childrens[k].contracts[n].estimate.balance;
                  result[i].estimate.balanceE += result[i].childrens[k].contracts[n].estimate.balanceE;
                  result[i].estimate.balanceEM += result[i].childrens[k].contracts[n].estimate.balanceEM;
                  result[i].visible = true;
                }
              }
            }
          }
          result[i].childrens = null;
        }
        // итого по всем факультетам
        if (result.length) result[mtuIndex].visible = true;
        for (var i = 0; i < result.length; i++) {
          if (result[i].parent === config.univ._id) {
            result[mtuIndex].estimate.remains += result[i].estimate.remains;
            result[mtuIndex].estimate.plan += result[i].estimate.plan;
            result[mtuIndex].estimate.income += result[i].estimate.income;
            result[mtuIndex].estimate.outlayO += result[i].estimate.outlayO;
            result[mtuIndex].estimate.outlay += result[i].estimate.outlay;
            result[mtuIndex].estimate.balance += result[i].estimate.balance;
            result[mtuIndex].estimate.balanceE += result[i].estimate.balanceE;
            result[mtuIndex].estimate.balanceEM += result[i].estimate.balanceEM;
          }
        }
        var list_objects = [];
        for (var i = 0; i < result.length; i++) {
          if (result[i].visible) {
            var trClass = 'treegrid-'.concat(result[i].node);
            if (result[i].parent) trClass += ' treegrid-parent-'.concat(result[i].parent);
            list_objects.push({
              url: "/report/department/" + result[i].node,
              name: result[i].name,
              steward: result[i].chief,
              stewardUrl: result[i].chiefUrl,
              trClass: trClass,
              estimate: result[i].estimate
            });
            for (var j = 0; j < result[i].contracts.length; j++) {
              if (result[i].contracts[j] && result[i].contracts[j].visible) {
                list_objects.push({
                  url: "/report/contract/" + encodeURIComponent(result[i].contracts[j].contract),
                  name: result[i].contracts[j].contract,
                  steward: result[i].contracts[j].steward,
                  stewardUrl: "/report/steward/" + encodeURIComponent(result[i].contracts[j].steward),
                  //trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-'.concat(result[i].node, ' contract '),
                  trClass: 'treegrid-' + result[i].node + j + ' treegrid-parent-'.concat(result[i].node, ' contract '),
                  estimate: result[i].contracts[j].estimate
                });
              }
            }
          }
        }
        res.render('report/tree_list', {
          title: 'Подразделения',
          title1: 'Подразделение/ЛицСчёт',
          title2: 'Ответственный',
          longTitle: '&nbsp;Вид деятельности: <span style="font-weight: 700;">' + sourceName + '</span>',
          record_list: list_objects
        });
      });
    });
  });
}

exports.department_estimate_list = function(req, res, next) {
  // url: /report/department/:department
  // смета итого по подразделению req.params.department
  const department = req.params.department;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;

  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regnodes = [];
      var query;
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист:  выбрать все договора
        // подразделения department и финансирования sourceCode
        query = { $match: { 
          source: { $regex: '^' + sourceCode } ,
          parent: { $regex: '^' + department } 
        } };
      } else {
        // пользователь - руководитель договора(ов) и/или подразделения(ий)
        // выбрать все договора где res.locals.userName руководитель
        var scopeSteward = [ { "_id.steward": { $eq: res.locals.userName } } ];
          // и все договора всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { $and: [
            { source: { $regex: '^' + sourceCode } },
            { parent: { $regex: '^' + department } },
            { $or: scopeSteward }
          ] } 
        };
        // маски договоров в подчинении
        for (var k = 0; k < departs.length; k++) {
          regnodes.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('smeta')
      .aggregate([
        query,
        { $group : { 
            _id: { eCode: "$_id.eCode", eName: "$_id.eName"},
            remains: { $sum: "$remains"},
            plan: { $sum: "$plan"},
            income: { $sum: "$income"},
            outlayO: { $sum: "$outlayO"},
            outlay: { $sum: "$outlay"},
            balance: { $sum: "$balance"},
            balanceE: { $sum: "$balanceE"},
            balanceEM: { $sum: "$balanceEM"}
        }},
        { $project: {
            name: { $concat: [ "$_id.eCode", " ", "$_id.eName" ] },
            url: { $concat: [ "/report/outlays/department/", department, "/ecode/", "$_id.eCode"  ] },
            estimate: {
              remains: "$remains",
              plan: "$plan",
              income: "$income",
              outlayO: "$outlayO",
              outlay: "$outlay",
              balance: "$balance",
              balanceE: "$balanceE",
              balanceEM: "$balanceEM"
        }}},
        { $sort: { name: 1} }
      ])
      .toArray(function (err, list_estimates) {
        if (err) { return next(err); }
          // path
          db.collection('departments')
          .find({node: department})
          .toArray(function (err, departments) {
            if (err) { return next(err); }
            var dep_doc;
            if (departments.length) {
              dep_doc = departments[0];
            }
            client.close();
            res.render('report/detail', {
              title: sourceName + '/' + (dep_doc ? dep_doc.name : '-'), 
              title1: titleKOSGU,
              longTitle: pathTitle(dep_doc, sourceName, res.locals.userRole, regnodes),
              ecode: '',
              tabs: [
                { flag: true, href: "/report/department/" + encodeURIComponent(department)},
                { flag: false, href: "/report/incomes/department/" + encodeURIComponent(department)},
                { flag: false, href: "/report/outlays/department/" + encodeURIComponent(department)}
              ],
              record_list: list_estimates,
              income_list: [],
              outlay_list: []
            });
        });
      });
    });
  });
}

exports.department_income_list = function(req, res, next) {
  // url /report/incomes/department/:department записи прихода по подразделению
  const department = req.params.department;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regnodes = [];
      var conditions = [{source: {$regex: '^' + sourceCode}}, {parent: {$regex: '^' + department}}];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          regnodes.push(RegExp('^'+departs[i].department));
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      // записи прихода
      db.collection('incomes')
      .aggregate([
        { $match: { $and: conditions } },
        { $sort: { date: -1, eCode: 1 } }
      ])
      .toArray(function (err, list_incomes) {
        if (err) { return next(err); }
        // path
        db.collection('departments')
        .find({node: department})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc;
          if (departments.length) {
            dep_doc = departments[0];
          }
          client.close();
          res.render('report/detail', {
            title: sourceName + '/' + (dep_doc ? dep_doc.name : '-'),
            title1: titleKOSGU,
            //longTitle: longTitle(list_departments, sourceName),
            longTitle: pathTitle(dep_doc, sourceName, res.locals.userRole, regnodes),
            ecode: '',
            tabs: [
              { flag: false, href: "/report/department/" + encodeURIComponent(department)},
              { flag: true, href: "/report/incomes/department/" + encodeURIComponent(department)},
              { flag: false, href: "/report/outlays/department/" + encodeURIComponent(department)}
            ],
            record_list: [],
            income_list: list_incomes,
            outlay_list: []
          });
        });
      });
    });
  });
}

exports.department_outlay_list = function(req, res, next) {
  // url: /report/outlays/department/:department
  // записи расхода по всем договорам подразделения req.params.department
  const department = req.params.department;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regnodes = [];
      var conditions = [{source: {$regex: '^' + sourceCode}}, {parent: {$regex: '^' + department}}];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          regnodes.push(RegExp('^'+departs[i].department));
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      // записи расхода
      db.collection('outlays' + res.locals.variant).aggregate([
        { $match: { $and: conditions } },
        { $sort: { date: -1, eCode: 1 } }
      ])
      .toArray(function (err, list_outlays) {
        // path
        db.collection('departments')
        .find({node: department})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc;
          if (departments.length) {
            dep_doc = departments[0];
          }
          client.close();
          res.render('report/detail', {
            title: sourceName + '/' + (dep_doc ? dep_doc.name : '-'),
            title1: titleKOSGU,
            //longTitle: longTitle(list_departments, sourceName),
            longTitle: pathTitle(dep_doc, sourceName, res.locals.userRole, regnodes),
            ecode: '',
            tabs: [
              { flag: false, href: "/report/department/" + encodeURIComponent(department)},
              { flag: false, href: "/report/incomes/department/" + encodeURIComponent(department)},
              { flag: true, href: "/report/outlays/department/" + encodeURIComponent(department)}
            ],
            record_list: [],
            income_list: [],
            outlay_list: list_outlays
          });
        });
      });
    });
  });
}

exports.department_ecode_outlay_list = function(req, res, next) {
  // url: /report/outlays/department/:department/ecode/:ecode
  // записи расхода по статье req.params.ecode 
  // по всем договорам подразделения req.params.department
  const ecode = req.params.ecode;
  const department = req.params.department;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var regnodes = [];
      var conditions = [
        { source: { $regex: '^' + sourceCode } }, 
        { parent: { $regex: '^' + department } },
        { eCode: { $eq: ecode } }
      ];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          regnodes.push(RegExp('^'+departs[i].department));
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      // записи расхода
      db.collection('outlays' + res.locals.variant).aggregate([ 
        { $match: { $and: conditions } },
        { $sort: { date: -1, eCode: 1 }} 
      ]).toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        // path
        db.collection('departments')
        .find({node: department})
        .toArray(function (err, departments) {
          if (err) { return next(err); }
          var dep_doc;
          if (departments.length) {
            dep_doc = departments[0];
          }
          client.close();
          res.render('report/detail', {
            title: sourceName + '/' + (dep_doc ? dep_doc.name : '-'),
            title1: titleKOSGU,
            //longTitle: longTitle(list_departments, sourceName),
            longTitle: pathTitle(dep_doc, sourceName, res.locals.userRole, regnodes),
            ecode: ecode,
            tabs: [
              { flag: false, href: "/report/department/" + encodeURIComponent(department)},
              { flag: false, href: "/report/incomes/department/" + encodeURIComponent(department)},
              { flag: true, href: "/report/outlays/department/" + encodeURIComponent(department)}
            ],
            record_list: [],
            income_list: [],
            outlay_list: list_outlays
          });
        });
      });
    });
  });
}

function pathTitle(department, sourceName, role, regnodes) {
  var title = '&nbsp;Подразделение&nbsp;';
  title += ' <span style="color: #ccc">/</span> ';
  var node = '', name = '', scope = false;
  var isBooker = role == 'booker'
if (department) {
    if (department.node != config.univ._id) {
      node = config.univ._id;
      name = config.univ.abbr;
      scope = isBooker;
      for (var k = 0; !scope && k < regnodes.length; k++) {
        if (node.match(regnodes[k])) {
          scope = true;
        }
      }
      if (scope) {
        title += '<a href="/report/department/' + node + '">';
      } 
      title += name;
      if (scope) {
        title += '</a>';
      }
      title += ' <span style="color: #ccc">/</span> ';
    }
    
    if (department.parent && department.parent != config.univ._id) {
      // есть parent - факультет
      node = department.parent;
      name = department._id.depCode + ' ' + department.depAbbr
      scope = isBooker;
      for (var k = 0; !scope && k < regnodes.length; k++) {
        if (node.match(regnodes[k])) {
          scope = true;
        }
      }
      if (scope) {
        title += '<a href="/report/department/' + node + '">';
      } 
      title += name;
      if (scope) {
        title += '</a>';
      }
      title += ' <span style="color: #ccc">/</span> ';
      // кафедра
      name = department._id.divCode + ' ' + department.divAbbr
    } else {
      // нет parent, это и есть факультет
      name = department._id.depCode + ' ' + department.depAbbr
    }
  }
  title += ' &nbsp; <span style="font-weight: 700;">' +  name + '</span>';
  title += ' ; &nbsp;вид деятельности:&nbsp; ' + sourceName;
  return title;
}
