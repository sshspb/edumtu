var User = require('../models/steward');

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;
  req.userName = res.locals.userName = null;
  if (!req.session.user) return next();

  User.findById(req.session.user, function(err, user) {
    if (err) return next(err);

    req.user = res.locals.user = user;
    req.userName = res.locals.userName = user.name;
    next();
  });
};
