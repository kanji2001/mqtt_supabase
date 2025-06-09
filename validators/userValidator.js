const { z } = require('zod');

const userRegisterSchema = z.object({
name: z.string().min(2).max(50).regex(/^[a-zA-Z ]+$/, 'Name must only contain letters and spaces'),
common_name: z.string().min(2).max(100),
quantity: z.number().int().positive().gte(1),
password: z.string().min(8)
.regex(/[A-Z]/, 'Must contain an uppercase letter')
.regex(/[a-z]/, 'Must contain a lowercase letter')
.regex(/[0-9]/, 'Must contain a digit')
.regex(/[\W_]/, 'Must contain a special character'),
});

const userLoginSchema = z.object({
common_name: z.string().min(2),
password: z.string().min(1),
mac_address: z.string().optional(),
});

module.exports = {
userRegisterSchema,
userLoginSchema,
};