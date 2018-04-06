const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;
  req.userName = res.locals.userName = null;
  if (!req.session.user) return next();

  res.locals.variant = req.session.variant || "0";
  res.locals.scope = req.session.scope || "0";
  res.locals.variant_list = config.variant_list;
  res.locals.scope_list = config.scope_list;
  res.locals.estimate_index = config.estimate_index;

  var login = req.session.user;
  MongoClient.connect(config.dbUrl, function(err, client) {
    client.db(config.dbName)
    .collection('stewards')
    .findOne({login: login}).then(function(user) {
        client.close();
      if (err) return next(err);
      req.user = res.locals.user = user;
      req.userName = res.locals.userName = user._id;
      next();
    });
  });
};
