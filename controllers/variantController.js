exports.set_variant = function(req, res, next) {
  req.session.variant = req.params.id;
  res.redirect('back');
};
