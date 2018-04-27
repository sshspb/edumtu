const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;

exports.steward_contract_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('stewards_contracts')
    .find({ scope: res.locals.scope })
    .toArray(function (err, list_stewards) {
      client.close();
      if (err) { return next(err); }

      var list_objects = []
      var total = { remains: 0, plan: 0, income: 0,
            outlayO: 0, outlay: 0, balance: 0, balanceE: 0, balanceWO: 0, balanceO: 0 };
  
      for (var i = 0; i < list_stewards.length; i++) {
        list_objects.push({
          trClass: 'treegrid-' + i + ' treegrid-parent-000',
          name: list_stewards[i].name,
          url:  list_stewards[i].url,
          estimate: list_stewards[i].estimate
        })
        for (var j = 0; j < list_stewards[i].contracts.length; j++) {
          list_objects.push({
            trClass: 'treegrid-' + i + '-' + j + ' treegrid-parent-' + i + ' contract ',
            name: list_stewards[i].contracts[j].name,
            url:  list_stewards[i].contracts[j].url,
            estimate: list_stewards[i].contracts[j].estimate
          })
        }
        total.remains += list_stewards[i].estimate.remains;
        total.plan += list_stewards[i].estimate.plan;
        total.income += list_stewards[i].estimate.income;
        total.outlayO += list_stewards[i].estimate.outlayO;
        total.outlay += list_stewards[i].estimate.outlay;
        total.balance += list_stewards[i].estimate.balance;
        total.balanceE += list_stewards[i].estimate.balanceE;
        total.balanceWO += list_stewards[i].estimate.balanceWO;
        total.balanceO += list_stewards[i].estimate.balanceO;
      }
      list_objects.unshift({ 
        trClass: 'treegrid-000',
        name: "Всего",
        url: '#',
        estimate: total 
      });

      res.render('report/tree_list', {
        title: scope_list[res.locals.scope] + '/Ответственные',
        title1: 'Ответственный/ЛицСчёт', 
        longTitle: '&nbsp;Вид деятельности:&nbsp; <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        record_list: list_objects
      });
    });
  });
};

exports.steward_estimate_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('estimates')
    .aggregate([
      { $match: { 
        "_id.steward": {$eq: req.params.steward}, 
        "_id.scope": {$eq: res.locals.scope} 
      }},
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
        '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope];
      res.render('report/detail', {
        title: scope_list[res.locals.scope] + '/' + req.params.steward,
        title1: '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>',
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
        '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope];
      res.render('report/detail', {
        title: scope_list[res.locals.scope] + '/' + req.params.steward,
        title1: '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>',
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
    db.collection('outlays')
    .aggregate([
      { $match: { 
        steward: { $eq: req.params.steward }, 
        scope: { $eq: res.locals.scope } 
      }},
      { $sort: { date: -1 } }
    ])
    .toArray(function (err, list_outlays) {
      client.close();
      if (err) { return next(err); }
      var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
        '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope];
      res.render('report/detail', {
        title: scope_list[res.locals.scope] + '/' + req.params.steward,
        title1: '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>',
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
}

exports.steward_ecode_outlay_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);
    db.collection('outlays')
    .aggregate([
      { $match: { 
        steward: { $eq: req.params.steward }, 
        scope: { $eq: res.locals.scope },
        eCode: req.params.ecode
      }},
      { $sort: { date: -1 } }
    ])
    .toArray(function (err, list_outlays) {
      client.close();
      if (err) { return next(err); }
      var longTitle = '&nbsp;Ответственный&nbsp;  <span style="font-weight: 700;">' + req.params.steward +
        '</span>, &nbsp;вид деятельности:&nbsp; ' + scope_list[res.locals.scope];
      res.render('report/detail', {
        title: scope_list[res.locals.scope] + '/' + req.params.steward,
        title1: '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>',
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
}
