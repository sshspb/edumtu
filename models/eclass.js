// File: ./models/eclass.js

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var EclassSchema = new Schema({
  code: String,
  name: String,
});

EclassSchema
.virtual('url')
.get(function () {
  return '/catalog/eclass/' + this._id;
});

module.exports = mongoose.model('Eclass', EclassSchema );