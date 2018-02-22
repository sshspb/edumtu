// File: ./models/contract.js

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ContractSchema = new Schema({
  _id: String,
  name: String,
  department: {type: String, ref: 'Department'},
  parentunit: {type: String, ref: 'Department'},
  estimate: { 
    type: [{
      "code": String, 
      "name": String, 
      "remains": Number, 
      "income": Number, 
      "outlay": Number, 
      "balance": Number
    }],
    default: []
  },
  _source: { type: Schema.Types.ObjectId, ref: 'Source' },
  _steward: {type: Schema.Types.ObjectId, ref: 'Steward'},
  _assistants: [{type: Schema.Types.ObjectId, ref: 'Steward'}]
});

ContractSchema
.virtual('url')
.get(function () {
  return '/catalog/contract/' + this._id;
});

ContractSchema
.virtual('budget')
.get(function () {
  var budget = {remains: 0, income: 0, outlay: 0, balance: 0};
  var book = this.estimate;
  var bookLength = book.length;
  for (var i = 0; i < bookLength; i++) {
    budget.remains += book[i].remains;
    budget.income += book[i].income;
    budget.outlay += book[i].outlay;
    budget.balance += book[i].balance;
  }
  return budget;
});

module.exports = mongoose.model('Contract', ContractSchema );