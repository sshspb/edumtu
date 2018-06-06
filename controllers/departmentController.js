var async = require('async');
const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;
const title1 = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.eclass_list = function(req, res, next) {
  res.redirect("/report/department/" + res.locals.scope + "00000");
}

exports.department_contract_list = function(req, res, next) {
  // url: /report/departments_contracts
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
  
      db.collection('departments')
      .aggregate([
        { $match: {scope: {$eq: res.locals.scope} } },
        { $sort: {_id: 1}}
      ]) 
      .toArray(function (err, list_departments) {
        if (err) { 
          console.log(err); 
          return next(err); 
        }
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
          longTitle: '&nbsp;Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
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
        query = { $match: { 
          parent: { $regex: '^' + req.params.department }
        }};
      } else {
        var scope = [{"_id.steward": { $eq: res.locals.userName } }];
        for (var i = 0; i < departs.length; i++) {
          scope.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match:
          { 
            $and: [
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scope }
            ] 
          } 
        };
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
              longTitle: longTitle(list_departments, scope_list[res.locals.scope]),
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
            longTitle: longTitle(list_departments, scope_list[res.locals.scope]),
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
        query = { $match: { 
          parent: { $regex: '^' + req.params.department }
        }};
      } else {
        var scope = [{ steward: { $eq: res.locals.userName } }];
        for (var i = 0; i < departs.length; i++) {
          scope.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match: { 
            $and: [
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scope }
            ] 
        } };
        for (var k = 0; k < departs.length; k++) {
          regexps.push(RegExp('^'+departs[k].department));
        }
      }

      db.collection('outlays' + res.locals.variant)
      .aggregate([
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
              longTitle: longTitle(list_departments, scope_list[res.locals.scope]),
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
      if (res.locals.userRole == 'booker') {
        query = { $match: { 
          eCode: req.params.ecode,
          parent: { $regex: '^' + req.params.department }
        }};
      } else {
        var scope = [{ steward: { $eq: res.locals.userName } }];
        for (var i = 0; i < departs.length; i++) {
          scope.push({ parent: { $regex: '^' + departs[i].department } })
        }
        query = { $match: { 
            $and: [
              { eCode: { $eq: req.params.ecode } },
              { parent: { $regex: '^' + req.params.department } }, 
              { $or: scope }
            ] 
        } };
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
              longTitle: longTitle(list_departments, scope_list[res.locals.scope]),
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

function longTitle(list_departments, scope) {
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
  return longTitle;
}

