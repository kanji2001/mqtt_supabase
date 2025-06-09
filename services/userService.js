const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const certService = require('./certService');

async function registerUserService({ name, common_name, quantity, password }) {
  // Check if user with same common_name exists
  const { data: existingUser, error: existingError } = await supabase
    .from('usertable')
    .select('id')
    .eq('common_name', common_name)
    .single();

  if (existingError && existingError.code !== 'PGRST116') { 
    throw new Error(existingError.message);
  }
  if (existingUser) throw new Error('User with this common name already exists');

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Insert new user with hashed password
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

  // Fetch CA cert/key from DB (table 'ca')
  const { data: caRow, error: caError } = await supabase
    .from('ca')
    .select('ca_cert, ca_key')
    .limit(1)
    .single();

  if (caError || !caRow) {
    throw new Error('CA cert/key not found in database');
  }

  // Generate client certificate using certService
  const { client_key, client_crt } = await certService.generateCertificate({
    common_name,
    ca_cert: caRow.ca_cert,
    ca_key: caRow.ca_key
  });

  // Update user row with generated client_key and client_crt
  const { data: updatedUser, error: updateError } = await supabase
    .from('usertable')
    .update({
      client_key,
      client_crt,
      updated_at: new Date()
    })
    .eq('id', userInsert.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return {
    message: 'User registered and certificate generated',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      common_name: updatedUser.common_name
    }
  };
}

exports.loginUser = async ({ common_name, password, mac_address }) => {
const { data: user, error } = await supabase
.from('usertable')
.select('id, name, common_name, password, client_key, client_crt, mac_address')
.eq('common_name', common_name)
.single();

if (error || !user) throw new Error('Invalid credentials');

const isValid = await bcrypt.compare(password, user.password);
if (!isValid) throw new Error('Invalid credentials');

if (!user.mac_address && mac_address) {
const { data: updated, error: updateErr } = await supabase
.from('usertable')
.update({ mac_address, updated_at: new Date() })
.eq('id', user.id)
.select()
.single();
if (updateErr) throw updateErr;
user.mac_address = updated.mac_address;
}

const { data: caRow, error: caErr } = await supabase
.from('ca')
.select('ca_cert')
.limit(1)
.single();
if (caErr || !caRow) throw new Error('CA cert not found');

return {
id: user.id,
name: user.name,
common_name: user.common_name,
mac_address: user.mac_address,
ca_cert: caRow.ca_cert,
client_key: user.client_key,
client_crt: user.client_crt,
};
};

module.exports = {
  registerUser: registerUserService,
};


