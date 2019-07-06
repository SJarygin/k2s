const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/main', function(req, res, next) {
  res.render('main', { title: 'SipMedia', });
});

module.exports = router;
