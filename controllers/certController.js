const certService = require('../services/certService');

exports.generateCertificate = async (req, res, next) => {
  try {
    const result = await certService.generateCertificate(req.body.common_name);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getUserCertificate = async (req, res, next) => {
  try {
    const result = await certService.getUserCertificate(req.params.common_name);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
