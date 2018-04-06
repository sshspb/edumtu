exports.set_variant = function(req, res, next) {
  req.session.variant = req.params.id;
  res.redirect('back');
};

exports.set_scope = function(req, res, next) {
  req.session.scope = req.params.id;
  res.redirect('/report/eclasses');
};
