const { userLoginSchema } = require('../validators/userValidator');
const { loginUser } = require('../services/authService');

exports.login = async (req, res) => {
try {
const validated = userLoginSchema.parse(req.body);
const result = await loginUser(validated);
res.status(200).json(result);
} catch (err) {
const message = err.errors?.[0]?.message || err.message;
res.status(400).json({ error: message });
}
};