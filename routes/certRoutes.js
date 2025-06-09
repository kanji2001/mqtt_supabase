const express = require('express');
const router = express.Router();
const certController = require('../controllers/certController');

router.post('/generate-certificate', certController.generateCertificate);
router.get('/user-certificate/:common_name', certController.getUserCertificate);

module.exports = router;
