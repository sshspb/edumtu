const MongoClient = require('mongodb').MongoClient;
const config = require('../config');

exports.set_variant = function(req, res, next) {
  req.session.variant = req.params.id;
  res.redirect('back');
};
/*
exports.set_scope = function(req, res, next) {
  req.session.scope = req.params.id;
  req.session.source = "0";
  res.redirect('/report/department/' + config.univ._id);
};
*/
exports.set_source = function(req, res, next) {
  req.session.source = req.params.id;
  res.redirect('/report/department/' + config.univ._id);
};
