var Estimate = require('../models/estimate');

exports.estimate_list = function(req, res, next) {
    Estimate.aggregate()
    .group({ 
        _id: { $concat: [ "$code", " ", "$name" ] },
        plan: { $sum: { "$add": [ "$remains", "$income" ] } },
        balance: { $sum: "$balance"}
    })
    .sort({_id: 1})
    .exec(function (err, list_estimates) {
        if (err) { return next(err); }
        //Successful, so render
        res.render('estimate_list', { 
            basehref: req.url,
            title: 'Планы', 
            estimate_list: list_estimates 
        });
    });
};

exports.estimate_detail = function(req, res) {
    res.send('NOT IMPLEMENTED: estimate detail: ' + req.params.id);
};
