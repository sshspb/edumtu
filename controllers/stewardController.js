const MongoClient = require('mongodb').MongoClient;
const config = require('../config');
const scope_list = config.scope_list;

exports.steward_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('stewards')
    .find({ scope: res.locals.scope })
    .toArray(function (err, list_stewards) {
      client.close();
      if (err) { return next(err); }
      res.render('report/steward_list', { 
        longTitle: 'Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        title: 'Ответственный', 
        record_list: list_stewards
      });
    });
  });
};

exports.steward_contract_list = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('stewards_contracts')
    .find({ scope: res.locals.scope })
    .toArray(function (err, list_stewards) {
      client.close();
      if (err) { return next(err); }

      var list_objects = []
      for (var i = 0; i < list_stewards.length; i++) {
        list_objects.push({
          trClass: 'treegrid-' + i,
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
      }

      res.render('report/tree_list', {
        longTitle: 'Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
        title: 'Ответственный/Договор', 
        record_list: list_objects
      });
    });
  });
};

exports.steward_detail = function(req, res, next) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    db = client.db(config.dbName);

    db.collection('contracts')
    .find({ steward: req.params.id, scope: {$eq: res.locals.scope} })
    .sort( {_id: 1} )
    .toArray(function (err, list_contracts) {
        client.close();
        if (err) { return next(err); }
        res.render('report/steward_detail', { 
          longTitle: 'Вид деятельности: <span style="font-weight: 700;">' + scope_list[res.locals.scope] + '</span>',
          title: req.params.id, 
          record_list: list_contracts 
        });
      });
  });
};
