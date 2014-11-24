var express = require('express');
var code = require('../models/code');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  code.create("C", function (id) {
    console.log("Sending him to " + id);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.redirect(301, '/code/' + id );
  });
});

router.param('codeid', function(req, res, next, id){
    req.codeid = id;
    next();
});

router.get('/code/:codeid', function(req, res) {
    code.get(req.codeid, function (thisCode) {
        res.render('index', {title: 'Nodecode', code: thisCode, user: req.user});
    });
});
module.exports = router;
