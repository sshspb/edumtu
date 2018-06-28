const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const titleKOSGU = '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>';

exports.steward_contract_list = function(req, res, next) {
  // url: /report/stewards_contracts  форма "Ответственные / ЛицСчета - итоговые суммы"
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var conditions = [ { source: { $regex: '^' + sourceCode } } ];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      // договора с итогами
      db.collection('estimates')
      .aggregate([{ $match: { $and: conditions }}, { $sort: { steward: 1 }}])
      .toArray(function (err, list_contracts) {
        client.close();
        if (err) { return next(err); }
        // добовим руководителей договоров
        var list_objects = [], steward = "@@@", indexSteward = 0;
        var total = {remains:0,plan:0,income:0,outlayO:0,outlay:0,balance:0,balanceE:0,balanceEM:0};
        for (var i = 0; i < list_contracts.length; i++) {
          if (steward !== list_contracts[i].steward) {
            steward = list_contracts[i].steward;
            indexSteward = list_objects.length;
            list_objects.push({
              trClass: 'treegrid-' + indexSteward + ' treegrid-parent-000',
              name: steward,
              url:  '/report/steward/' + encodeURIComponent(steward),
              estimate: {remains:0,plan:0,income:0,outlayO:0,outlay:0,balance:0,balanceE:0,balanceEM:0}
            });
          }
          list_objects.push({
            trClass: 'treegrid-1-' + i + ' treegrid-parent-' + indexSteward + ' contract ',
            name: list_contracts[i].contract,
            url: '/report/contract/' + encodeURIComponent(list_contracts[i].contract),
            estimate: list_contracts[i].estimate
          });
          list_objects[indexSteward].estimate.remains += list_contracts[i].estimate.remains;
          list_objects[indexSteward].estimate.plan += list_contracts[i].estimate.plan;
          list_objects[indexSteward].estimate.income += list_contracts[i].estimate.income;
          list_objects[indexSteward].estimate.outlayO += list_contracts[i].estimate.outlayO;
          list_objects[indexSteward].estimate.outlay += list_contracts[i].estimate.outlay;
          list_objects[indexSteward].estimate.balance += list_contracts[i].estimate.balance;
          list_objects[indexSteward].estimate.balanceE += list_contracts[i].estimate.balanceE;
          list_objects[indexSteward].estimate.balanceEM += list_contracts[i].estimate.balanceEM;
          total.remains += list_contracts[i].estimate.remains;
          total.plan += list_contracts[i].estimate.plan;
          total.income += list_contracts[i].estimate.income;
          total.outlayO += list_contracts[i].estimate.outlayO;
          total.outlay += list_contracts[i].estimate.outlay;
          total.balance += list_contracts[i].estimate.balance;
          total.balanceE += list_contracts[i].estimate.balanceE;
          total.balanceEM += list_contracts[i].estimate.balanceEM;
        }
        list_objects.unshift({ 
          trClass: 'treegrid-000',
          name: "Всего",
          url: "/report/department/" + res.locals.scope + "00000",
          estimate: total 
        });
        res.render('report/tree_list', {
          title: 'Ответственные',
          title1: 'Ответственный/ЛицСчёт', 
          longTitle: '&nbsp;Вид деятельности:&nbsp; <span style="font-weight: 700;">' + sourceName + '</span>',
          record_list: list_objects
        });
      });
    });
  });
};

exports.steward_estimate_list = function(req, res, next) {
  // url: /report/steward/:steward смета итого по ответственному
  const steward = req.params.steward;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var conditions = [{source: {$regex: '^' + sourceCode}}, {steward: {$eq: steward}}];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      db.collection('smeta')
      .aggregate([
        { $match: { $and: conditions } },
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
            eCode: "$_id.eCode",
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
        client.close();
        for (var i = 0; i < list_estimates.length; i++) {
          list_estimates[i].url = "/report/outlays/steward/" + encodeURIComponent(steward) + 
              "/ecode/" + encodeURIComponent(list_estimates[i].eCode);
        }
        res.render('report/detail', {
          title: req.params.steward,
          title1: titleKOSGU,
          longTitle: '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + steward +
          '</span>, &nbsp;вид деятельности:&nbsp; ' + sourceName,
          ecode: '',
          tabs: [
            { flag: true, href: "/report/steward/" + encodeURIComponent(steward)},
            { flag: false, href: "/report/incomes/steward/" + encodeURIComponent(steward)},
            { flag: false, href: "/report/outlays/steward/" + encodeURIComponent(steward)}
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
  // url: /report/incomes/steward/:steward  записи прихода руководителя
  const steward = req.params.steward;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var conditions = [{source: {$regex: '^' + sourceCode}}, {steward: {$eq: steward}}];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      db.collection('incomes')
      .aggregate([
        { $match: { $and: conditions } },
        { $sort: { date: -1 } }
      ])
      .toArray(function (err, list_incomes) {
        client.close();
        if (err) { return next(err); }
        var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + steward +
          '</span>, &nbsp;вид деятельности:&nbsp; ' + sourceName;
        res.render('report/detail', {
          title: steward,
          title1: titleKOSGU,
          longTitle: longTitle,
          ecode: '',
          tabs: [
            { flag: false, href: "/report/steward/" + encodeURIComponent(steward)},
            { flag: true, href: "/report/incomes/steward/" + encodeURIComponent(steward)},
            { flag: false, href: "/report/outlays/steward/" + encodeURIComponent(steward)}
          ],
          record_list: [],
          income_list: list_incomes,
          outlay_list: []
        });
      });
    });
  });
}

exports.steward_outlay_list = function(req, res, next) {
  // url: /report/outlays/steward/:steward  записи расхода руководителя
  const steward = req.params.steward;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var conditions = [{source: {$regex: '^' + sourceCode}}, {steward: {$eq: steward}}];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      db.collection('outlays' + res.locals.variant)
      .aggregate([
        { $match: { $and: conditions } },
        { $sort: { date: -1 } }
      ])
      .toArray(function (err, list_outlays) {
        client.close();
        if (err) { return next(err); }
        res.render('report/detail', {
          title: steward,
          title1: titleKOSGU,
          longTitle: '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + steward +
            '</span>, &nbsp;вид деятельности:&nbsp; ' + sourceName,
          ecode: '',
          tabs: [
            { flag: false, href: "/report/steward/" + encodeURIComponent(steward)},
            { flag: false, href: "/report/incomes/steward/" + encodeURIComponent(steward)},
            { flag: true, href: "/report/outlays/steward/" + encodeURIComponent(steward)}
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
  // url: /report/outlays/steward/:steward/ecode/:ecode  записи расхода руководителя
  const ecode = req.params.ecode;
  const steward = req.params.steward;
  const sourceCode = res.locals.source_code;
  const sourceName = res.locals.source_name;
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName + res.locals.year);
    // пользователь руководит подразделениями
    client.db(config.dbName).collection('chiefs')
    .find({steward: res.locals.userName})
    .toArray(function(err, departs) {
      var conditions = [
        { source: { $regex: '^' + sourceCode } },
        { steward: { $eq: steward } }, 
        { eCode: { $eq: ecode } }
      ];
      if (res.locals.userRole !== 'booker') {
        // выбрать все договора где пользователь - руководитель
        var scopeSteward = [ { steward: { $eq: res.locals.userName } } ];
        // и все договора всех подразделений где пользователь - руководитель
        for (var i = 0; i < departs.length; i++) {
          scopeSteward.push({ parent: { $regex: '^' + departs[i].department } })
        }
        conditions.push({$or: scopeSteward});
      }
      db.collection('outlays' + res.locals.variant)
      .aggregate([
        { $match: { $and: conditions } },
        { $sort: { date: -1 } }
      ]).toArray(function (err, list_outlays) {
        client.close();
        if (err) { return next(err); }
        res.render('report/detail', {
          title: steward,
          title1: titleKOSGU,
          longTitle: '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + steward +
            '</span>, &nbsp;вид деятельности:&nbsp; ' + sourceName,
          ecode: ecode,
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
