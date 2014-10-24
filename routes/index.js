var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.redirect(301, '/' + Math.random(137, 999999));
});

router.param('codeid', function(req, res, next, id){
    if (!id.match(/^\d+$/)) {
        return next('route');
    }
    console.log("Setting codeid param");
    req.codeid = id;
    next();
});

router.get('/:codeid', function(req, res) {
	res.render('index', {title: 'Nodecode', codeid: 'asdfasdf' + req.codeid});
});
module.exports = router;
