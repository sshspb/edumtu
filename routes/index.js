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

router.get('/',  function(req, res) {
  var docsQty = {
    departments: 0,
    contracts: 0,
    stewards: 0,
    sources: 0,
    eclasss: 0,
    incomes: 0,
    outlays: 0,
    species: 0,
    version: 'Данные не загружены'
  }; 
  MongoClient.connect(config.dbUrl, function(err, client) {
    client.db(config.dbName)
    .collection('quantitys')
    .find({})
    .toArray(function(err, quantitys) {
      client.close();
      if (err) { return next(err); }
      if (quantitys.length) docsQty = quantitys[0];
      if (req.user) {
        if (req.user.role == 'admin') {
          //res.render('admin/index');
          res.render('report/index', { 
            title: 'Оперативно-финансовый отдел', 
            subtitle: 'учёта образовательной деятельности', 
            data: docsQty
          });
        } else {
          res.render('report/index', { 
            title: 'Оперативно-финансовый отдел', 
            subtitle: 'учёта образовательной деятельности', 
            data: docsQty
          });
        }
      } else {
        res.render('login', { 
          title: 'Оперативно-финансовый отдел', 
          subtitle: 'учёта образовательной деятельности', 
          data: docsQty
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

router.get('/importdata', function(req, res) {
  var importData = require('../lib/tbImport').importData;
  var reformData = require('../lib/tbReform').reformData;
  async.series([
    importData,
    reformData
  ], 
  function(err) {
    req.session.destroy();
    res.redirect('/');
  });
});

function authorize(username, password, callback) {
  var login = username.toUpperCase(); // login регистронезависимый
  MongoClient.connect(config.dbUrl, function(err, client) {
    client.db(config.dbName)
    .collection('stewards')
    .findOne({login: login})
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
