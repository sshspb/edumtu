//var Eclass = require('../models/eclass');
var Contract = require('../models/contract');

exports.eclass_list = function(req, res, next) {
  Contract.aggregate([
    { $unwind:"$estimate" },
    { $group: { 
        _id: {code: "$estimate.code", name: "$estimate.name"}, 
        remains: {$sum: "$estimate.remains"}, 
        income: {$sum: "$estimate.income"}, 
        outlay: {$sum: "$estimate.outlay"}, 
        balance: { $sum: "$estimate.balance"}
    }},
    { $project: {
        code: "$_id.code",
        name: "$_id.name", 
        remains: 1,
        income: 1,
        outlay: 1,
        balance: 1
    }},
    { $sort: { "_id.code": 1} }
  ],
  function (err, list_eclasses) {
    if (err) { return next(err); }
    res.render('eclass_list', { 
      basehref: req.url,
      title: 'План', 
      eclass_list: list_eclasses
    });
  });
};

exports.eclass_detail = function(req, res) {
    res.send('NOT IMPLEMENTED: eclass detail: ' + req.params.id);
};
