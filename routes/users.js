var express     = require('express');
var router      = express.Router();

var ok = {ok: 'ok'};
module.exports = function(passport) {
  router.post('/login', passport.authenticate('login'), function (req, res) {res.send(ok); });
  router.post('/register', passport.authenticate('signup'), function (req, res) {res.send(ok); });
  router.post('/logout', function (req, res) {
    req.session = null;
    res.send(ok);
  });
  return router;
};
