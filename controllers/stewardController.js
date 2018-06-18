const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;
const title1 = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.steward_contract_list = function(req, res, next) {
  // url: /report/stewards_contracts  отчёт - список "Ответственные / ЛицСчета"
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {

      var query;
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист
        query = { "_id.scope": {$eq: res.locals.scope} };
      } else {
        // пользователь - руководитель договора
        var chiefscope = [ { "_id.steward": { $eq: res.locals.userName } } ];
        // пользователь - руководитель подразделения
        for (var i = 0; i < departs.length; i++) {
          chiefscope.push({contracts: {"$elemMatch": {"parent": {'$regex': '^'+ departs[i].department }}}});
        }
        query =  { $and: [
            { "_id.scope": {$eq: res.locals.scope} },
            { $or: chiefscope } 
        ] };
      }

      db.collection('stewards_contracts')
      .aggregate([
        { $match: query },
        { $sort: { "_id.steward": 1 } }
      ])
      .toArray(function (err, list_stewards) {
        client.close();
        if (err) { return next(err); }

        var list_objects = [];
        var allFin =  res.locals.source === "0";
        var total = { remains: 0, plan: 0, income: 0, outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
        var newSteward, indexSteward;

        for (var i = 0; i < list_stewards.length; i++) {
          newSteward = true;
          for (var j = 0; j < list_stewards[i].contracts.length; j++) {
            if (allFin || list_stewards[i].contracts[j].source === res.locals.source_list[res.locals.source].name) {
              // договор прошёл фильтр, внести в список
              if (newSteward) {
                // руководителя внести в список
                newSteward = false;
                indexSteward = list_objects.length;
                list_objects.push({
                  trClass: 'treegrid-' + i + ' treegrid-parent-000',
                  name: list_stewards[i]._id.steward,
                  url:  '/report/steward/' + encodeURIComponent(list_stewards[i]._id.steward),
                  estimate: { remains: 0, plan: 0, income: 0,
                    outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 }
                });
              }
              list_objects.push({
                trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-' + i + ' contract ',
                name: list_stewards[i].contracts[j].fullname || list_stewards[i].contracts[j].name,
                url: '/report/contract/' + encodeURIComponent(list_stewards[i].contracts[j].name),
                estimate: list_stewards[i].contracts[j].estimate
              });
              list_objects[indexSteward].estimate.remains += list_stewards[i].contracts[j].estimate.remains;
              list_objects[indexSteward].estimate.plan += list_stewards[i].contracts[j].estimate.plan;
              list_objects[indexSteward].estimate.income += list_stewards[i].contracts[j].estimate.income;
              list_objects[indexSteward].estimate.outlayO += list_stewards[i].contracts[j].estimate.outlayO;
              list_objects[indexSteward].estimate.outlay += list_stewards[i].contracts[j].estimate.outlay;
              list_objects[indexSteward].estimate.balance += list_stewards[i].contracts[j].estimate.balance;
              list_objects[indexSteward].estimate.balanceE += list_stewards[i].contracts[j].estimate.balanceE;
              list_objects[indexSteward].estimate.balanceWO += list_stewards[i].contracts[j].estimate.balanceWO;
              list_objects[indexSteward].estimate.balanceO += list_stewards[i].contracts[j].estimate.balanceO;

              total.remains += list_stewards[i].contracts[j].estimate.remains;
              total.plan += list_stewards[i].contracts[j].estimate.plan;
              total.income += list_stewards[i].contracts[j].estimate.income;
              total.outlayO += list_stewards[i].contracts[j].estimate.outlayO;
              total.outlay += list_stewards[i].contracts[j].estimate.outlay;
              total.balance += list_stewards[i].contracts[j].estimate.balance;
              total.balanceE += list_stewards[i].contracts[j].estimate.balanceE;
              total.balanceWO += list_stewards[i].contracts[j].estimate.balanceWO;
              total.balanceO += list_stewards[i].contracts[j].estimate.balanceO;
            }
          }
        }
        list_objects.unshift({ 
          trClass: 'treegrid-000',
          name: "Всего",
          url: "/report/department/" + res.locals.scope + "00000",
          estimate: total 
        });
  
        res.render('report/tree_list', {
          title: scope_list[res.locals.scope] + '/Ответственные',
          title1: 'Ответственный/ЛицСчёт', 
          longTitle: '&nbsp;Вид деятельности:&nbsp; <span style="font-weight: 700;">' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name + '</span>',
          record_list: list_objects
        });
      });
    });
  });
};

exports.steward_estimate_list = function(req, res, next) {
  // url: /report/steward/:steward
  // сметы, план и исполнение, итого по ответственному req.params.steward
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var query;
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист
        if (res.locals.source == "0") {
          // всё финансирование
          query = { 
            "_id.steward": {$eq: req.params.steward}, 
            "_id.scope": {$eq: res.locals.scope} 
          };
        } else {
         // финансирование res.locals.source
         query = { 
          "_id.steward": {$eq: req.params.steward}, 
          "_id.scope": {$eq: res.locals.scope},
          "_id.source": { $eq: res.locals.source_list[res.locals.source].name}
          };
        }
      } else {
        // пользователь - руководитель договора
        var scope = [ { "_id.steward": {$eq: res.locals.userName} } ];
        // пользователь - руководитель подразделения
        for (var i = 0; i < departs.length; i++) {
          scope.push( { parent: { $regex: '^' + departs[i].department } } );
        }
        if (res.locals.source == "0") {
          // всё финансирование
          query =  { $and: [
            { "_id.steward": {$eq: req.params.steward} }, 
            { "_id.scope": {$eq: res.locals.scope} },
            { $or: scope } ] 
          };
        } else {
          query =  { $and: [
            { "_id.steward": {$eq: req.params.steward} }, 
            { "_id.scope": {$eq: res.locals.scope} },
            { "_id.source": { $eq: res.locals.source_list[res.locals.source].name} },
            { $or: scope } ] 
          };
        }
      }

      db.collection('estimates')
      .aggregate([
        { $match: query },
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
            url: { $concat: [ "/report/outlays/steward/", req.params.steward, "/ecode/", "$_id.eCode" ] },
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
        client.close();
        var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
          '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name;
        res.render('report/detail', {
          title: scope_list[res.locals.scope] + '/' + req.params.steward,
          title1: title1,
          longTitle: longTitle,
          ecode: '',
          tabs: [
            { flag: true, href: "/report/steward/" + encodeURIComponent(req.params.steward)},
            { flag: false, href: "/report/incomes/steward/" + encodeURIComponent(req.params.steward)},
            { flag: false, href: "/report/outlays/steward/" + encodeURIComponent(req.params.steward)}
          ],
          record_list: list_estimates,
          income_list: [],
          outlay_list: []
        });
      });
    });
  });
};

exports.steward_income_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('incomes')
    .aggregate([
      { $match: { 
        steward: { $eq: req.params.steward }, 
        scope: { $eq: res.locals.scope } 
      }},
      { $sort: { date: -1 } }
    ])
    .toArray(function (err, list_incomes) {
      client.close();
      if (err) { return next(err); }
      var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
        '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name;
      res.render('report/detail', {
        title: scope_list[res.locals.scope] + '/' + req.params.steward,
        title1: title1,
        longTitle: longTitle,
        ecode: '',
        tabs: [
          { flag: false, href: "/report/steward/" + encodeURIComponent(req.params.steward)},
          { flag: true, href: "/report/incomes/steward/" + encodeURIComponent(req.params.steward)},
          { flag: false, href: "/report/outlays/steward/" + encodeURIComponent(req.params.steward)}
        ],
        record_list: [],
        income_list: list_incomes,
        outlay_list: []
      });
    });
  });
}

exports.steward_outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    
    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var query;
      if (res.locals.userRole == 'booker') {
        // пользователь - экономист
        if (res.locals.source == "0") {
          // всё финансирование
          query = { 
            steward: { $eq: req.params.steward }, 
            scope: { $eq: res.locals.scope } 
          };
        } else {
          // финансирование res.locals.source
          query = { 
            steward: { $eq: req.params.steward }, 
            scope: { $eq: res.locals.scope },
            source: { $eq: res.locals.source_list[res.locals.source].name}
          }
        }
      } else {
        var chiefscope = [ { steward: { $eq: res.locals.userName } }];
        for (var i = 0; i < departs.length; i++) {
          chiefscope.push({ parent: { $regex: '^' + departs[i].department } })
        }
        if (res.locals.source == "0") {
          // всё финансирование
          query = { $and: [
            { steward: { $eq: req.params.steward } }, 
            { scope: { $eq: res.locals.scope } },
            { $or: chiefscope }
          ] };
        } else {
          // финансирование res.locals.source
          query = { $and: [
            { steward: { $eq: req.params.steward } }, 
            { scope: { $eq: res.locals.scope } },
            { source: { $eq: res.locals.source_list[res.locals.source].name} },
            { $or: chiefscope }
          ] };
        }
      }

      db.collection('outlays' + res.locals.variant)
      .aggregate([
        { $match: query },
        { $sort: { date: -1 } }
      ])
      .toArray(function (err, list_outlays) {
        client.close();
        if (err) { return next(err); }
        var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
          '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name;
        res.render('report/detail', {
          title: scope_list[res.locals.scope] + '/' + req.params.steward,
          title1: title1,
          longTitle: longTitle,
          ecode: '',
          tabs: [
            { flag: false, href: "/report/steward/" + encodeURIComponent(req.params.steward)},
            { flag: false, href: "/report/incomes/steward/" + encodeURIComponent(req.params.steward)},
            { flag: true, href: "/report/outlays/steward/" + encodeURIComponent(req.params.steward)}
          ],
          record_list: [],
          income_list: [],
          outlay_list: list_outlays
        });
      });
    });
  });
}

exports.steward_ecode_outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    
    // пользователь это экономист с полным доступом к информации или это
    // руководитель договора и/или подразделения с ограниченным доступом
    db.collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var query;
      if (res.locals.userRole == 'booker') {
        query = { 
          steward: { $eq: req.params.steward }, 
          scope: { $eq: res.locals.scope },
          eCode: req.params.ecode
        };
        if (res.locals.source !== "0") {
          query.source = { $eq: res.locals.source_list[res.locals.source].name };
        }
      } else {
        var chiefscope = [ { steward: { $eq: res.locals.userName } }];
        for (var i = 0; i < departs.length; i++) {
          chiefscope.push({ parent: { $regex: '^' + departs[i].department } })
        }
        if (res.locals.source === "0") {
          query = { 
            $and: [
              { steward: { $eq: req.params.steward } }, 
              { scope: { $eq: res.locals.scope } },
              { eCode: { $eq: req.params.ecode } },
              { $or: chiefscope }
            ] 
          };
        } else {
          query = { 
            $and: [
              { steward: { $eq: req.params.steward } }, 
              { scope: { $eq: res.locals.scope } },
              { source: { $eq: res.locals.source_list[res.locals.source].name} },
              { eCode: { $eq: req.params.ecode } },
              { $or: chiefscope }
            ] 
          };
        }
      }
    
      db.collection('outlays' + res.locals.variant)
      .aggregate([
        { $match: query },
        { $sort: { date: -1 } }
      ])
      .toArray(function (err, list_outlays) {
        client.close();
        if (err) { return next(err); }
        var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
          '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope] + ' / ' + res.locals.source_list[res.locals.source].name;
        res.render('report/detail', {
          title: scope_list[res.locals.scope] + '/' + req.params.steward,
          title1: title1,
          longTitle: longTitle,
          ecode: req.params.ecode,
          tabs: [
            { flag: false, href: "/report/steward/" + encodeURIComponent(req.params.steward)},
            { flag: false, href: "/report/incomes/steward/" + encodeURIComponent(req.params.steward)},
            { flag: true, href: "/report/outlays/steward/" + encodeURIComponent(req.params.steward)}
          ],
          record_list: [],
          income_list: [],
          outlay_list: list_outlays
        });
      });
    });
  });
}
