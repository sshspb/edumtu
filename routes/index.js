const fs = require('fs');
const path = require('path');
const util = require('util');
const async = require('async');
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const MongoClient = require('mongodb').MongoClient;
const AuthError = require('../lib/error').AuthError;
const HttpError = require('../lib/error').HttpError;
const config = require('../config');

router.get('/',  function(req, res, next) {
  var docsQty = {
    departments: 0,
    contracts: 0,
    stewards: 0,
    incomes: 0,
    outlays0: 0,
    outlays1: 0,
    version: 'Данные не загружены'
  }; 
  MongoClient.connect(config.dbUrl, function(err, client) {
    var db = client.db(config.dbName + res.locals.year);
    db.collection('quantitys')
    .find({})
    .toArray(function(err, quantitys) {
      client.close();
      if (err) { return next(err); }
      if (quantitys.length) {
        docsQty = quantitys[0];
        docsQty.version = config.version;
        req.session.okdata = true;
      } else {
        req.session.okdata = false;
      }
      if (req.user) {
        if (req.user.role == 'admin') {
          res.render('admin/index', { 
            title: "Оперативно-финансовый отдел", 
            subtitle: "учёта образовательной деятельности", 
            data: docsQty,
            year_list: res.locals.year_list,
            data_year: res.locals.year
          });
        } else {
          res.redirect('/report/department/' + config.univ._id);
        }
      } else {
        res.render('login', { 
          scope: req.session && req.session.scope ? req.session.scope : "0",
          title: 'Оперативно-финансовый отдел', 
          subtitle: 'учёта образовательной деятельности', 
          data: docsQty,
          year_list: res.locals.year_list,
          dataYear: res.locals.year
        });
      }
    });
  });
});

router.post('/', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  authorize(username, password, function(err, user) {
    if (err) {
      if (err instanceof AuthError) {
        return next(new HttpError(403, err.message));
      } else {
        return next(err);
      }
    }
    req.session.user = user.login;
    res.send({});
  });
});

router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

function authorize(username, password, callback) {
  MongoClient.connect(config.dbUrl, function(err, client) {
    client.db(config.dbName)
    .collection('users')
    .findOne({login: username})
    .then(
      user => {
        client.close();
        if (user) {
          if (crypto.createHmac('sha1', user.salt).update(password).digest('hex') === user.hashedPassword) {
            callback(null, user);
          } else {
            callback(new AuthError("Пароль неверен"));
          }
        } else {
          callback(new AuthError("Login неверен"));
        }
      },
      error => {
        callback(new AuthError("Login неверен"));
      }
   );
  });
}

module.exports = router;
