module.exports = function(req, res, next) {
  if (!req.session.user) {
    req.session.destroy();
    res.redirect('/');
  }
  next();
};
