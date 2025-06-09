const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.post('/add-device', deviceController.addDevice);
router.get('/device-info/:macaddress', deviceController.getDeviceInfo);

module.exports = router;
