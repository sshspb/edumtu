var async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;
const title1 = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.department_contract_list = function(req, res, next) {
  if (res.locals.source == "0") {
    // все источники финансирования
    department_contract_list_0(req, res, next);
  } else {
    // один источник финансирования
    department_contract_list_X(req, res, next);
  }
}

department_contract_list_0 = function(req, res, next) {
  // url: /report/departments_contracts
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    // на случай если пользователь - руководитель подразделения(ий)
    // а если пользователь - руководитель договора - то не здесь, а steward_contract_list
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs){
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('departments_contracts')
      .aggregate([
        { $match: {scope: {$eq: res.locals.scope} } },
        { $sort: {_id: 1}}
      ]) 
      .toArray(function (err, list_departments) {
        if (err) { console.log(err); return next(err); }
        client.close();
    
        var list_objects = [];
        for (var i = 0; i < list_departments.length; i++) {

          var scopeChief = false;
          if (res.locals.userRole == 'booker') {
            scopeChief = true;
          } else {
            for (var k = 0; k < regexps.length; k++) {
              if (list_departments[i]._id.match(regexps[k])) {
                scopeChief = true;
                if (list_departments[i]._id == departs[k].department) {
                  list_departments[i].parent = '';
                }
              }
            }
          }
          
          if (scopeChief) {
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
                stewardUrl: list_departments[i].contracts[j].stewardUrl,
                trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-'.concat(list_departments[i]._id, ' contract '),
                estimate: list_departments[i].contracts[j].estimate
              });
            }
          }
        }

        res.render('report/tree_list', {
          title: 'Подразделения',
          title1: 'Подразделение/ЛицСчёт',
          title2: 'Ответственный',
          longTitle: '&nbsp;Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name + '</span>',
          record_list: list_objects
        });
      });
    });
  });
}

department_contract_list_X = function(req, res, next) {
  // url: /report/departments_contracts
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    // на случай если пользователь - руководитель подразделения(ий)
    // а если пользователь - руководитель договора - то не здесь, а steward_contract_list
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs){
      var regexps = [];
      if (res.locals.userRole != 'booker') {
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('departments_buffer').aggregate([
        { $match: {scope: {$eq: res.locals.scope} } },
        { $lookup:
          { from: "departments_buffer",
            localField: "_id",
            foreignField: "parent",
            as: "childrens"
          }
        },
        { $sort: { "_id": 1} }
      ])
      .toArray(function(err, result) {
        if (err) { console.log(err); return next(err); }
        client.close();

        var mtuIndex;
        for (var i = 0; i < result.length; i++) {
          result[i].estimate = { remains: 0, plan: 0, income: 0, outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
          if (result[i].parent == "") {
            mtuIndex = i;
          } else {
            for (var j = 0; j < result[i].contracts.length; j++) {
              // итого сметы договоров непосредственного подчинения
              if (result[i].contracts[j].source == res.locals.source_list[res.locals.source].name) {
                result[i].estimate.remains += result[i].contracts[j].estimate.remains;
                result[i].estimate.plan += result[i].contracts[j].estimate.plan;
                result[i].estimate.income += result[i].contracts[j].estimate.income;
                result[i].estimate.outlayO += result[i].contracts[j].estimate.outlayO;
                result[i].estimate.outlay += result[i].contracts[j].estimate.outlay;
                result[i].estimate.balance += result[i].contracts[j].estimate.balance;
                result[i].estimate.balanceE += result[i].contracts[j].estimate.balanceE;
                result[i].estimate.balanceWO += result[i].contracts[j].estimate.balanceWO;
                result[i].estimate.balanceO += result[i].contracts[j].estimate.balanceO;
              } else {
                result[i].contracts[j].estimate = { remains: 0, plan: 0, income: 0, outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
              }
            }
            for (var k = 0; k < result[i].childrens.length; k++) {
              result[i].childrens[k].estimate = { remains: 0, plan: 0, income: 0, outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
              for (var j = 0; j < result[i].childrens[k].contracts.length; j++) {
                // итого сметы договоров подразделения подчинённого (кафедры для факультета)
                if (result[i].childrens[k].contracts[j].source == res.locals.source_list[res.locals.source].name) {
                  result[i].estimate.remains += result[i].childrens[k].contracts[j].estimate.remains;
                  result[i].estimate.plan += result[i].childrens[k].contracts[j].estimate.plan;
                  result[i].estimate.income += result[i].childrens[k].contracts[j].estimate.income;
                  result[i].estimate.outlayO += result[i].childrens[k].contracts[j].estimate.outlayO;
                  result[i].estimate.outlay += result[i].childrens[k].contracts[j].estimate.outlay;
                  result[i].estimate.balance += result[i].childrens[k].contracts[j].estimate.balance;
                  result[i].estimate.balanceE += result[i].childrens[k].contracts[j].estimate.balanceE;
                  result[i].estimate.balanceWO += result[i].childrens[k].contracts[j].estimate.balanceWO;
                  result[i].estimate.balanceO += result[i].childrens[k].contracts[j].estimate.balanceO;
                }
              }
            }
          }
          result[i].childrens = null;
        }

        for (var i = 0; i < result.length; i++) {
          if (result[i].parent === (result[i].scope + config.univ._id) && mtuIndex !== undefined) {
            result[mtuIndex].estimate.remains += result[i].estimate.remains;
            result[mtuIndex].estimate.plan += result[i].estimate.plan;
            result[mtuIndex].estimate.income += result[i].estimate.income;
            result[mtuIndex].estimate.outlayO += result[i].estimate.outlayO;
            result[mtuIndex].estimate.outlay += result[i].estimate.outlay;
            result[mtuIndex].estimate.balance += result[i].estimate.balance;
            result[mtuIndex].estimate.balanceE += result[i].estimate.balanceE;
            result[mtuIndex].estimate.balanceWO += result[i].estimate.balanceWO;
            result[mtuIndex].estimate.balanceO += result[i].estimate.balanceO;
          }
        }

        var list_objects = [];
        for (var i = 0; i < result.length; i++) {

          var scopeChief = false;
          if (res.locals.userRole == 'booker') {
            scopeChief = true;
          } else {
            for (var k = 0; k < regexps.length; k++) {
              if (result[i]._id.match(regexps[k])) {
                scopeChief = true;
                if (result[i]._id == departs[k].department) {
                  result[i].parent = '';
                }
              }
            }
          }
          
          if (scopeChief) {
            var trClass = 'treegrid-'.concat(result[i]._id);
            if (result[i].parent) trClass += ' treegrid-parent-'.concat(result[i].parent);
            result[i].trClass = trClass;
            list_objects.push(result[i]);
            for (var j = 0; j < result[i].contracts.length; j++) {
              if (result[i].contracts[j]) {
                list_objects.push({
                  url: result[i].contracts[j].url,
                  name: result[i].contracts[j]._id,
                  steward: result[i].contracts[j].steward,
                  stewardUrl: result[i].contracts[j].stewardUrl,
                  trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-'.concat(result[i]._id, ' contract '),
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
          longTitle: '&nbsp;Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name + '</span>',
          record_list: list_objects
        });
      });
    });
  });
}

exports.department_estimate_list = function(req, res, next) {
  // url: /report/department/:department
  // сметы, план и исполнение, итого по подразделению req.params.department
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    
    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var query;
      var regexps = [];
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист
        // выбрать все договора подразделения req.params.department
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $match: { 
            parent: { $regex: '^' + req.params.department }
          }};
        } else {
          // финансирование res.locals.source
          query = { $match: 
            { $and: [
              { "_id.source": { $eq: res.locals.source_list[res.locals.source].name } },
              { parent: { $regex: '^' + req.params.department } }
            ] }
          };
        }
      } else {
        // пользователь - руководитель договора(ов) и/или подразделения(ий)
        // выбрать все договора где res.locals.userName руководитель
        var scopeSteward = [ { "_id.steward": { $eq: res.locals.userName } } ];
          // и все договора всех подразделений где res.locals.userName руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        if (res.locals.source == "0") {
          query = { $match: 
            { $and: [
                { parent: { $regex: '^' + req.params.department } }, 
                { $or: scopeSteward }
            ] } 
          };
        } else {
          query = { $match:
            { $and: [
                { parent: { $regex: '^' + req.params.department } }, 
                { "_id.source": { $eq: res.locals.source_list[res.locals.source].name } },
                { $or: scopeSteward }
            ] } 
          };
        }
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }
  
      db.collection('estimates')
      .aggregate([
        query,
        { $group : { 
            _id: { eCode: "$_id.eCode", eName: "$_id.eName"},
            remains: { $sum: "$estimate.remains"},
            plan: { $sum: "$estimate.plan"},
            income: { $sum: "$estimate.income"},
            outlayO: { $sum: "$estimate.outlayO"},
            outlay: { $sum: "$estimate.outlay"},
            balance: { $sum: "$estimate.balance"},
            balanceE: { $sum: "$estimate.balanceE"},
            balanceWO: { $sum: "$estimate.balanceWO"},
            balanceO: { $sum: "$estimate.balanceO"}
        }},
        { $project: {
            name: { $concat: [ "$_id.eCode", " ", "$_id.eName" ] },
            url: { $concat: [ "/report/outlays/department/", req.params.department, "/ecode/", "$_id.eCode"  ] },
            estimate: {
              remains: "$remains",
              plan: "$plan",
              income: "$income",
              outlayO: "$outlayO",
              outlay: "$outlay",
              balance: "$balance",
              balanceE: "$balanceE",
              balanceWO: "$balanceWO",
              balanceO: "$balanceO"
        }}},
        { $sort: { name: 1} }
      ])
      .toArray(function (err, list_estimates) {
        if (err) { return next(err); }
        var node = req.params.department;
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
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0]._id.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? departments[0].url : '',
                name: departments[0].name
              });
  
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: scope_list[res.locals.scope] + '/' + list_departments[list_departments.length-1].name,
              title1: title1,
              longTitle: longTitle(list_departments, scope_list[res.locals.scope], res.locals.source_list[res.locals.source].name),
              ecode: '',
              tabs: [
                { flag: true, href: "/report/department/" + encodeURIComponent(req.params.department)},
                { flag: false, href: "/report/incomes/department/" + encodeURIComponent(req.params.department)},
                { flag: false, href: "/report/outlays/department/" + encodeURIComponent(req.params.department)}
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
}

exports.department_income_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('incomes')
    .aggregate([
      { $match: { 
        parent: { $regex: '^' + req.params.department }
      }},
      { $sort: { date: -1 } }
    ])
    .toArray(function (err, list_incomes) {
      if (err) { return next(err); }
      var node = req.params.department;
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
            list_departments.push({ 
              url: departments[0].url,
              name: departments[0].name
            });
            callback(null);
          });
        }, 
        function() {
          client.close();
          res.render('report/detail', {
            title: scope_list[res.locals.scope] + '/' + list_departments[list_departments.length-1].name,
            title1: title1,
            longTitle: longTitle(list_departments, scope_list[res.locals.scope], res.locals.source_list[res.locals.source].name),
            ecode: '',
            tabs: [
              { flag: false, href: "/report/department/" + encodeURIComponent(req.params.department)},
              { flag: true, href: "/report/incomes/department/" + encodeURIComponent(req.params.department)},
              { flag: false, href: "/report/outlays/department/" + encodeURIComponent(req.params.department)}
            ],
            record_list: [],
            income_list: list_incomes,
            outlay_list: []
          });
        }
      );
    });
  });
}

exports.department_outlay_list = function(req, res, next) {
  // url: /report/outlays/department/:department
  // записи расхода по всем договорам подразделения req.params.department
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    
    // пользователь это экономист res.locals.userRole == 'booker' 
    // с полным доступом к информации или это руководитель 
    // договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {

      var query;
      var regexps = [];
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист - выбрать все договора подразделения req.params.department
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $match: { parent: { $regex: '^' + req.params.department } } };
          } else {
          // финансирование res.locals.source
          query = { $match: 
            { $and: [
              { source: { $eq: res.locals.source_list[res.locals.source].name } },
              { parent: { $regex: '^' + req.params.department } }
            ] }
          };
        }
      } else {
        // пользователь - руководитель договора(ов) и/или подразделения(ий)
        // выбрать все договора где res.locals.userName руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где res.locals.userName руководитель
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $match: { 
            $and: [
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scopeSteward }
            ] 
          }};
        } else {
          // финансирование res.locals.source
          query = { $match: { 
            $and: [
              { parent: { $regex: '^' + req.params.department } }, 
              { source: { $eq: res.locals.source_list[res.locals.source].name } },
              { $or: scopeSteward }
            ] 
          }};
        }
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('outlays' + res.locals.variant).aggregate([
        query,
        { $sort: { date: -1, eCode: 1 } }
      ])
      .toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        var node = req.params.department;
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
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0]._id.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? departments[0].url : '',
                name: departments[0].name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: scope_list[res.locals.scope] + '/' + list_departments[list_departments.length-1].name,
              title1: title1,
              longTitle: longTitle(list_departments, scope_list[res.locals.scope], res.locals.source_list[res.locals.source].name),
              ecode: '',
              tabs: [
                { flag: false, href: "/report/department/" + encodeURIComponent(req.params.department)},
                { flag: false, href: "/report/incomes/department/" + encodeURIComponent(req.params.department)},
                { flag: true, href: "/report/outlays/department/" + encodeURIComponent(req.params.department)}
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

exports.department_ecode_outlay_list = function(req, res, next) {
  // url: /report/outlays/department/:department/ecode/:ecode
  // записи расхода по статье req.params.ecode 
  // по всем договорам подразделения req.params.department
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    
    // пользователь это экономист res.locals.userRole == 'booker' 
    // с полным доступом к информации или это руководитель 
    // договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {

      var query;
      var regexps = [];
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист - выбрать все договора подразделения req.params.department
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $match: { 
            eCode: req.params.ecode,
            parent: { $regex: '^' + req.params.department }
          }};
        } else {
          // финансирование res.locals.source
          query = { $match: { 
            eCode: req.params.ecode,
            source: { $eq: res.locals.source_list[res.locals.source].name } ,
            parent: { $regex: '^' + req.params.department } 
          }};
        }
      } else {
        // пользователь - руководитель договора(ов) и/или подразделения(ий)
        // выбрать все договора где res.locals.userName руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }

        // и все договора всех подразделений где res.locals.userName руководитель
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $match: { 
            $and: [
              { eCode: { $eq: req.params.ecode } },
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scopeSteward }
            ] 
          }};

        } else {
          // финансирование res.locals.source
          query = { $match: { 
            $and: [
              { eCode: { $eq: req.params.ecode } },
              { source: { $eq: res.locals.source_list[res.locals.source].name } },
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scopeSteward }
            ] 
          }};
        }
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('outlays' + res.locals.variant)
      .aggregate([ query, { $sort: { date: -1, eCode: 1 }} ])
      .toArray(function (err, list_outlays) {
        if (err) { return next(err); }
        var node = req.params.department;
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
              var scopeChief = res.locals.userRole == 'booker' ? true : false;
              for (var k = 0; k < regexps.length; k++) {
                if (departments[0]._id.match(regexps[k])) {
                  scopeChief = true;
                }
              }
              list_departments.push({ 
                url: scopeChief ? departments[0].url : '',
                name: departments[0].name
              });
              callback(null);
            });
          }, 
          function() {
            client.close();
            res.render('report/detail', {
              title: scope_list[res.locals.scope] + '/' + list_departments[list_departments.length-1].name,
              title1: title1,
              longTitle: longTitle(list_departments, scope_list[res.locals.scope], res.locals.source_list[res.locals.source].name),
              ecode: req.params.ecode,
              tabs: [
                { flag: false, href: "/report/department/" + encodeURIComponent(req.params.department)},
                { flag: false, href: "/report/incomes/department/" + encodeURIComponent(req.params.department)},
                { flag: true, href: "/report/outlays/department/" + encodeURIComponent(req.params.department)}
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

function longTitle(list_departments, scopeName, sourceName) {
  var longTitle = '&nbsp;Подразделение&nbsp; ';
  for (var i = 0; i < list_departments.length - 1; i++) {
    longTitle += ' <span style="color: #ccc">/</span> &nbsp;';
    if (list_departments[i].url) {
      longTitle += '<a href="' + list_departments[i].url + '">' + list_departments[i].name + '</a>';
    } else {
      longTitle += list_departments[i].name;
    }
  }
  if (list_departments.length) {
    longTitle += ' <span style="color: #ccc">/</span> &nbsp;<span style="font-weight: 700;">' + 
      list_departments[list_departments.length-1].name + '</span>';
  }
  longTitle += ' ; &nbsp;вид деятельности:&nbsp; ' +  scopeName + ' / ' + sourceName;
  return longTitle;
}

