const deviceService = require('../services/deviceService');

exports.addDevice = async (req, res, next) => {
  try {
    const result = await deviceService.addDevice(req.body.macaddress);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getDeviceInfo = async (req, res, next) => {
  try {
    const result = await deviceService.getDeviceInfo(req.params.macaddress);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
