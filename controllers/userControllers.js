const { userRegisterSchema, userLoginSchema } = require('../validators/userValidator');
const userService = require('../services/userService');

exports.register = async (req, res, next) => {
try {
const validated = userRegisterSchema.parse(req.body);
const user = await userService.registerUser(validated);
res.status(201).json({ message: 'Registered', user });
} catch (err) {
next(err);
}
};

exports.login = async (req, res, next) => {
try {
const validated = userLoginSchema.parse(req.body);
const user = await userService.loginUser(validated);
res.status(200).json({ message: 'Login successful', user });
} catch (err) {
next(err);
}
};

exports.generateCert = async (req, res, next) => {
try {
const certInfo = await userService.generateCertificate(req.body.common_name);
res.status(200).json({ message: 'Certificate generated', certInfo });
} catch (err) {
next(err);
}
};