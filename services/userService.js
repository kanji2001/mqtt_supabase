const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const certService = require('./certService');

// Register new user and generate certificate
async function registerUser({ name, common_name, quantity, password }) {
  // 1. Check duplicate user
  const { data: existingUser, error: existingError } = await supabase
    .from('usertable')
    .select('id')
    .eq('common_name', common_name)
    .single();

  if (existingError && existingError.code !== 'PGRST116') throw new Error(existingError.message);
  if (existingUser) throw new Error('User with this common name already exists');

  // 2. Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // 3. Insert new user
  const { data: userInsert, error: insertError } = await supabase
    .from('usertable')
    .insert({
      name,
      common_name,
      quantity,
      remaining_quantity: quantity,
      password: password_hash,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // 4. Fetch CA cert & key
  const { data: caRow, error: caError } = await supabase
    .from('ca')
    .select('ca_cert, ca_key')
    .limit(1)
    .single();

  if (caError || !caRow) throw new Error('CA cert/key not found in database');

  // 5. Generate client cert
  const { client_key, client_crt } = await certService.generateCertificate({
    common_name,
    ca_cert: caRow.ca_cert,
    ca_key: caRow.ca_key,
  });

  // 6. Update user with certs
  const { data: updatedUser, error: updateError } = await supabase
    .from('usertable')
    .update({
      client_key,
      client_crt,
      updated_at: new Date(),
    })
    .eq('id', userInsert.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 7. Return success
  return {
    message: 'User registered and certificate generated',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      common_name: updatedUser.common_name,
    },
  };
}

// Login user and fetch certs
async function loginUser({ common_name, password }) {
  // 1. Get user
  const { data: user, error } = await supabase
    .from('usertable')
    .select('id, name, common_name, password, client_key, client_crt')
    .eq('common_name', common_name)
    .single();

  if (error || !user) throw new Error('Invalid credentials');

  // 2. Validate password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid credentials');

  // 3. Fetch CA cert
  const { data: caRow, error: caErr } = await supabase
    .from('ca')
    .select('ca_cert')
    .limit(1)
    .single();
  if (caErr || !caRow) throw new Error('CA cert not found');

  // 4. Get all MAC addresses
  const { data: macs, error: macErr } = await supabase
    .from('devicetable')
    .select('macaddress')
    .eq('userid', user.id);
  if (macErr) throw new Error('Failed to fetch MAC addresses');

  const mac_addresses = macs.map(m => m.macaddress);

  // 5. Return all user info
  return {
    id: user.id,
    name: user.name,
    common_name: user.common_name,
    mac_addresses,
    ca_cert: caRow.ca_cert,
    client_key: user.client_key,
    client_crt: user.client_crt,
  };
}

module.exports = {
  registerUser,
  loginUser,
};
