var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SpeciesSchema = new Schema({
  name: String
});

SpeciesSchema
.virtual('url')
.get(function () {
  return '/catalog/species/' + this._id;
});

module.exports = mongoose.model('Species', SpeciesSchema );