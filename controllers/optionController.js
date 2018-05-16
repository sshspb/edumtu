const config = require('../config');

exports.set_variant = function(req, res, next) {
  req.session.variant = req.params.id;
  res.redirect('back');
};

exports.set_scope = function(req, res, next) {
  req.session.scope = req.params.id;
  if (req.userRole == 'booker') {
    res.redirect('/report/department/' + req.session.scope + config.univ._id);
  } else {
    res.redirect('/report/steward/' + encodeURIComponent(req.userName));
  }

};
