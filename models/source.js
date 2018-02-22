// File: ./models/financing.js

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SourceSchema = new Schema({
  name: String,
});

SourceSchema
.virtual('url')
.get(function () {
  return '/catalog/source/' + this._id;
});

module.exports = mongoose.model('Source', SourceSchema );