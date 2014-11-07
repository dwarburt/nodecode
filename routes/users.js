var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/login', function(req, res) {
  if (req.session.i) {
    req.session.i = req.session.i + 1;
  } else {
    req.session.i = 1;
  }

  res.send('session counter: ' + req.session.i);
});

module.exports = router;
