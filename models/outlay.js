var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var OutlaySchema = new Schema({
  contract: {type: String, ref: 'Contract'},
  eclass: String,
  date: { type: Date, default: Date.now },
  species: String,
  sum: { type: Number, default: 0 },
  dct: String,
  note: String
});

module.exports = mongoose.model('Outlay', OutlaySchema);
