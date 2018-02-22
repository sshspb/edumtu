// File: ./models/department.js

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var DepartmentSchema = new Schema({
  _id: String,
  node: String,
  parent: String,
  code: String,
  abbr: String,
  name: String,
  _steward: {type: Schema.Types.ObjectId, ref: 'Steward'},
  _assistants: [{type: Schema.Types.ObjectId, ref: 'Steward'}],
  saldo: { type: Number, default: 0 }
});

DepartmentSchema.virtual('url')
  .get(function () {
    return '/catalog/department/' + this._id;
  });

module.exports = mongoose.model('Department', DepartmentSchema );