const supabase = require('../config/supabase');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const execPromise = require('../utils/execPromise');

const CERTS_DIR = path.join(__dirname, '../../certs');
if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR);

exports.generateCertificate = async ({ common_name, ca_cert, ca_key }) => {
  if (!common_name) throw { status: 400, message: 'common_name is required' };

  const keyPath = path.join(CERTS_DIR, `${common_name}.key`);
  const csrPath = path.join(CERTS_DIR, `${common_name}.csr`);
  const crtPath = path.join(CERTS_DIR, `${common_name}.crt`);

  const tmpCaCert = tmp.fileSync();
  const tmpCaKey = tmp.fileSync();

  fs.writeFileSync(tmpCaCert.name, ca_cert.replace(/\\n/g, '\n'));
  fs.writeFileSync(tmpCaKey.name, ca_key.replace(/\\n/g, '\n'));

  await execPromise(`openssl genrsa -out "${keyPath}" 2048`);
  await execPromise(`openssl req -new -key "${keyPath}" -subj "/CN=${common_name}" -out "${csrPath}"`);
  await execPromise(`openssl x509 -req -in "${csrPath}" -CA "${tmpCaCert.name}" -CAkey "${tmpCaKey.name}" -CAcreateserial -out "${crtPath}" -days 3650`);

  const client_key = fs.readFileSync(keyPath, 'utf8');
  const client_crt = fs.readFileSync(crtPath, 'utf8');

  // Cleanup
  fs.unlinkSync(keyPath);
  fs.unlinkSync(csrPath);
  fs.unlinkSync(crtPath);
  tmpCaCert.removeCallback();
  tmpCaKey.removeCallback();

  return { client_key, client_crt };
};

exports.getUserCertificate = async (common_name) => {
  const { data: user, error } = await supabase
    .from("usertable")
    .select("client_key, client_crt")
    .eq("common_name", common_name)
    .single();

  if (error || !user) throw { status: 404, message: "User not found" };
  return user;
};
