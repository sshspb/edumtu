// File: ./models/estimate.js

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var EstimateSchema = new Schema({
  contract: String,
  code: String,
  name: String,
  percent: { type: Number, default: 0 },
  remains: { type: Number, default: 0 },
  income: { type: Number, default: 0 },
  outlay: { type: Number, default: 0 },
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Estimate', EstimateSchema );
