var crypto = require('crypto');
var async = require('async');
var util = require('util');
var AuthError = require('../lib/error').AuthError;
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var StewardSchema = new Schema({
  name: String,
  role: String,  // ['admin', 'booker', 'master' or null]
  login: String,
  hashedPassword: String,
  salt: String
});

StewardSchema.virtual('url')
  .get(function () {
    return '/catalog/steward/' + this._id;
  });

StewardSchema.methods.encryptPassword = function(password) {
  return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
};
/*
StewardSchema.virtual('password')
  .set(function(password) {
    this._plainPassword = password;
    this.salt = Math.random() + '';
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function() { return this._plainPassword; });
*/
StewardSchema.methods.checkPassword = function(password) {
  return this.encryptPassword(password) === this.hashedPassword;
};

StewardSchema.statics.authorize = function(username, password, callback) {
  var User = this;
  var login = username.toUpperCase(); // login регистронезависимый
  async.waterfall([
    function(callback) {
      User.findOne({login: login}, callback);
    },
    function(user, callback) {
      if (user) {
        if (user.checkPassword(password)) {
          callback(null, user);
        } else {
          callback(new AuthError("Пароль неверен"));
        }
      } else {
        callback(new AuthError("Login неверен"));
      }
    }
  ], callback);
};

module.exports = mongoose.model('Steward', StewardSchema);
 