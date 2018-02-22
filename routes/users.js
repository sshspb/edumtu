var express = require('express');
var router = express.Router();
var User = require('../models/steward');
var AuthError = require('../lib/error').AuthError;
var HttpError = require('../lib/error').HttpError;

router.get('/logout', function(req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/login', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  User.authorize(username, password, function(err, user) {
    if (err) {
      if (err instanceof AuthError) {
        return next(new HttpError(403, err.message));
      } else {
        return next(err);
      }
    }
    req.session.user = user._id;
    res.send({});
  });
});

module.exports = router;
