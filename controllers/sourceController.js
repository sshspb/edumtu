var Source = require('../models/source');
var Contract = require('../models/contract');
var mongoose = require('mongoose');

exports.source_list = function(req, res, next) {
  Contract.aggregate([
    { $lookup:
      { from: "sources",
        localField: "_source",
        foreignField: "_id",
        as: "source"
      }
    },
    { $unwind:"$estimate" },
    { $group:
      { _id: { source: "$source.name", _source: "$_source" }, 
        income: {$sum: "$estimate.income"}, 
        remains: {$sum: "$estimate.remains"}, 
        outlay: {$sum: "$estimate.outlay"}, 
        balance: { $sum: "$estimate.balance"}
      }
    },
    { $sort: { "_id.source": 1} }
  ],
  function (err, list_sources) {
    if (err) { return next(err); }
    for (var i = 0; i < list_sources.length; i++) {
      list_sources[i].url = '/catalog/source/'.concat(list_sources[i]._id._source);
    }
    res.render('report/source_list', { 
      basehref: req.url,
      title: 'Источники', 
      source_list: list_sources
    });
  });
}

exports.source_detail = function(req, res, next) {
  var sourceName;
  Source.findById(req.params.id)
  .exec(function (err, source) {
    if (err) { return next(err); }
    sourceName = source.name;
    Contract.aggregate([
      { $match : { _source : mongoose.Types.ObjectId(req.params.id) }},
      { $unwind:"$estimate" },
      { $lookup: { from: "eclasses", localField: "estimate.code", foreignField: "code", as: "eclass"}},
      { $group: { 
          _id: { $arrayElemAt: [ "$eclass", 0 ] }, 
          remains: {$sum: "$estimate.remains"}, 
          income: {$sum: "$estimate.income"}, 
          outlay: {$sum: "$estimate.outlay"}, 
          balance: { $sum: "$estimate.balance"}
        }
      }, 
      { $project: { 
        "code": "$_id.code",
        "name": "$_id.name",
        "remains": 1,
        "income": 1,
        "outlay": 1,
        "balance": 1,
        "_id": 0 }
      },
      { $sort: { "code": 1} }
    ],
    function(err, list_estimates) {
      if (err) { return next(err); }
      res.render('report/source_detail', { 
        basehref: req.url,
        title: sourceName, 
        estimate_list: list_estimates 
      });
    });
  })
};
