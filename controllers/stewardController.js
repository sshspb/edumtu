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
        longTitle: 'Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        title: 'Ответственный/ЛицСчёт', 
        record_list: list_objects
      });
    });
  });
};

exports.steward_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('estimates')
    .aggregate([
      { $match: { 
        "_id.steward": {$eq: req.params.id}, 
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
          url: { $concat: [ "/report/eclass/", "$_id.eCode" ] },
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
      var longTitle = 'Вид деятельности: <span style="font-weight: 700;">' + 
        scope_list[res.locals.scope] + 
        '</span>, Ответственный  <span style="font-weight: 700;">' + 
        req.params.id;
      res.render('report/contract_detail', {
        longTitle: longTitle,
        title: '<abbr title = "Классификация операций сектора государственного управления">КОСГУ</abbr>',
        record_list: list_estimates,
        income_list: [],
        outlay_list: []
      });
    });
  });
};
