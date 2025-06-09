const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

async function loginUser({ common_name, password, mac_address }) {
  // Step 1: Find user
  const { data: user, error } = await supabase
    .from('usertable')
    .select('id, name, common_name, password, client_key, client_crt, mac_address')
    .eq('common_name', common_name)
    .single();

  if (error || !user) throw new Error('Invalid credentials');

  // Step 2: Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error('Invalid credentials');

  // Step 3: Validate MAC address match
  if (user.mac_address && user.mac_address !== mac_address) {
    throw new Error('MAC address does not match registered device');
  }

  // Step 4: Fetch CA cert
  const { data: ca, error: caErr } = await supabase
    .from('ca')
    .select('ca_cert')
    .limit(1)
    .single();

  if (caErr || !ca) throw new Error('CA not found');

  // Step 5: Return credentials
  return {
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      common_name: user.common_name,
      mac_address: user.mac_address,
      ca_cert: ca.ca_cert,
      client_key: user.client_key,
      client_crt: user.client_crt,
    }
  };
}

module.exports = {
  loginUser,
};
