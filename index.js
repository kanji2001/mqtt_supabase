const express = require('express');
const supabase = require('./supabaseClient');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
app.use(express.json());

const CA_DIR = path.join(__dirname, 'ca');
const CERTS_DIR = path.join(__dirname, 'certs');
if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR);

// POST /add-device
app.post('/add-device', async (req, res) => {
  const { macaddress } = req.body;

  if (!macaddress) {
    return res.status(400).json({ error: 'MAC address is required' });
  }

  try {
    const { data: existingDevice } = await supabase
      .from('devicetable')
      .select('id')
      .eq('macaddress', macaddress)
      .single();

    if (existingDevice) {
      return res.status(400).json({ error: 'MAC address already exists' });
    }

    const { data: users, error: userError } = await supabase
      .from('usertable')
      .select('*')
      .gt('remaining_quantity', 0)
      .order('name', { ascending: true });

    if (userError || !users || users.length === 0) {
      return res.status(400).json({ error: 'No available users with remaining quantity' });
    }

    const user = users[0];

    const { data: deviceData, error: insertError } = await supabase
      .from('devicetable')
      .insert({
        macaddress,
        userid: user.id,
      })
      .select();

    if (insertError) throw insertError;
    const updatedRemaining = user.remaining_quantity - 1;

    await supabase
      .from('usertable')
      .update({
        remaining_quantity: updatedRemaining,
        updated_at: new Date(),
      })
      .eq('id', user.id);

    res.status(201).json({
      message: 'Device assigned successfully',
      device: deviceData,
      assignedTo: user.name,
      remaining_quantity: updatedRemaining,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /device-info/:macaddress
app.get('/device-info/:macaddress', async (req, res) => {
  const { macaddress } = req.params;

  try {
    const { data: device } = await supabase
      .from('devicetable')
      .select('userid')
      .eq('macaddress', macaddress)
      .single();

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const userid = device.userid;

    const { data: users } = await supabase
      .from('usertable')
      .select('id, name, common_name')
      .eq('id', userid)
      .limit(1);

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    const { data: macs } = await supabase
      .from('devicetable')
      .select('macaddress')
      .eq('userid', userid);

    const macaddresses = macs.map(device => device.macaddress);

    res.json({
      userid: user.id,
      name: user.name,
      common_name: user.common_name,
      macaddresses
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /generate-certificate
app.post('/generate-certificate', async (req, res) => {
  const { common_name } = req.body;
  if (!common_name) return res.status(400).json({ error: 'common_name is required' });

  const keyPath = path.join(CERTS_DIR, `${common_name}.key`);
  const csrPath = path.join(CERTS_DIR, `${common_name}.csr`);
  const crtPath = path.join(CERTS_DIR, `${common_name}.crt`);

  try {
    await execPromise(`openssl genrsa -out "${keyPath}" 2048`);
    await execPromise(`openssl req -new -key "${keyPath}" -subj "/CN=${common_name}" -out "${csrPath}"`);
    await execPromise(
      `openssl x509 -req -in "${csrPath}" -CA "${CA_DIR}/ca.crt" -CAkey "${CA_DIR}/ca.key" -CAcreateserial -out "${crtPath}" -days 3650`
    );

    const client_key = fs.readFileSync(keyPath, 'utf8');
    const client_cert = fs.readFileSync(crtPath, 'utf8');

    res.status(200).json({
      common_name,
      client_key,
      client_cert,
      message: 'Certificate generated successfully',
    });
  } catch (err) {
    console.error('Error generating certificate:', err);
    res.status(500).json({ error: 'Certificate generation failed' });
  }
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});
