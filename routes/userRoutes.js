const express = require('express');
const router = express.Router();
const userController = require('../controllers/userControllers');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/generate-certificate', userController.generateCert);

module.exports = router;