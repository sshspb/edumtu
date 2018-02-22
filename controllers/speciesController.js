var Species = require('../models/species');

exports.species_list = function(req, res, next) {
  Species.find({})
  .sort({name: 1})
  .exec(function (err, list_species) {
    if (err) { return next(err); }
    res.render('species_list', { 
      basehref: req.url,
      title: 'Виды затрат', 
      species_list: list_species
    });
  });
}

exports.species_detail = function(req, res) {
    res.send('NOT IMPLEMENTED: species detail: ' + req.params.id);
};
