const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

async function loginUser({ common_name, password, mac_address }) {
const { data: user, error } = await supabase
.from('usertable')
.select('id, name, common_name, password, client_key, client_crt, mac_address')
.eq('common_name', common_name)
.single();

if (error || !user) throw new Error('Invalid credentials');

const isPasswordValid = await bcrypt.compare(password, user.password);
if (!isPasswordValid) throw new Error('Invalid credentials');

// Optionally assign MAC address if not already assigned
let updatedUser = user;
if (!user.mac_address && mac_address) {
const { data: updated, error: updateErr } = await supabase
.from('usertable')
.update({ mac_address, updated_at: new Date() })
.eq('id', user.id)
.select()
.single();
if (updateErr) throw updateErr;
updatedUser = updated;
}

// Get CA cert
const { data: ca, error: caErr } = await supabase
.from('ca')
.select('ca_cert')
.limit(1)
.single();
if (caErr || !ca) throw new Error('CA not found');

return {
message: 'Login successful',
user: {
id: updatedUser.id,
name: updatedUser.name,
common_name: updatedUser.common_name,
mac_address: updatedUser.mac_address,
ca_cert: ca.ca_cert,
client_key: updatedUser.client_key,
client_crt: updatedUser.client_crt,
}
};
}

module.exports = {
loginUser,
};