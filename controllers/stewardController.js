var Steward = require('../models/steward');
var Contract = require('../models/contract');

exports.steward_list = function(req, res, next) {
  // Только данного ответственного если role == 'master'
  var match = {};
  if (req.user.role == 'master') {
    match = { _id: req.user._id };
  }
  Steward.aggregate([
    { $match: match},
    { $lookup: {from:"contracts", localField:"_id", foreignField:"_steward", as:"contracts"}},
    {$unwind:"$contracts"}, 
    {$unwind:"$contracts.estimate"},
    {$group: 
      { _id: {url:"$_id", name:"$name"},
      remains: {$sum: "$contracts.estimate.remains"},
      income: {$sum: "$contracts.estimate.income"},
      outlay: {$sum: "$contracts.estimate.outlay"},
      balance: {$sum: "$contracts.estimate.balance"}
     }
    }, { 
      $project: {
        _id: 0,
        name: "$_id.name", 
        url: "$_id.url",
        remains: 1,
        income: 1,
        outlay: 1,
        balance: 1
      }
    }, { 
      $sort: { "name": 1} 
    }
  ],
  function (err, list_stewards) {
    if (err) { return next(err); }
    for (var i = 0; i < list_stewards.length; i++) {
      list_stewards[i].url = '/catalog/steward/'.concat(list_stewards[i].url.toString()); 
    }
    res.render('steward_list', { 
      basehref: req.url,
      title: 'Ответственные', 
      steward_list: list_stewards
    });
  });
};

exports.steward_detail = function(req, res, next) {
  Steward.findById(req.params.id)
  .exec(function (err, steward) {
    if (err) { return next(err); }
    Contract.find()
    .where('_steward').eq(req.params.id)
    .populate('_source')
    .sort( {name: 1} )
    .exec(function (err, list_contracts) {
      if (err) { return next(err); }
      res.render('steward_detail', { 
        basehref: req.url,
        steward: steward, 
        contract_list: list_contracts 
      });
    })
  })
};
