const express = require('express');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();
app.use(express.json());

// POST /add-device
app.post('/add-device', async (req, res) => {
  const { macaddress } = req.body;

  if (!macaddress) {
    return res.status(400).json({ error: 'MAC address is required' });
  }

  try {
    const { data: existingDevice, error: checkError } = await supabase
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

app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});
