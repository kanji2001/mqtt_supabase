const supabase = require("../config/supabase");

exports.addDevice = async (macaddress) => {
  if (!macaddress) throw { status: 400, message: "MAC address is required" };

  const { data: existingDevice } = await supabase
    .from("devicetable")
    .select("id")
    .eq("macaddress", macaddress)
    .single();

  if (existingDevice)
    throw { status: 400, message: "MAC address already exists" };

  const { data: users, error: userError } = await supabase
    .from("usertable")
    .select("*")
    .gt("remaining_quantity", 0)
    .order("name", { ascending: true });

  if (userError || !users.length)
    throw {
      status: 400,
      message: "No users available with remaining quantity",
    };

  const user = users[0];

  const { data: deviceData, error: insertError } = await supabase
    .from("devicetable")
    .insert({ macaddress, userid: user.id })
    .select();

  if (insertError) throw insertError;

  await supabase
    .from("usertable")
    .update({
      remaining_quantity: user.remaining_quantity - 1,
      updated_at: new Date(),
    })
    .eq("id", user.id);

  return {
    message: "Device assigned successfully",
    device: deviceData,
    assignedTo: user.name,
    remaining_quantity: user.remaining_quantity - 1,
  };
};

exports.getDeviceInfo = async (macaddress) => {
  const { data: device } = await supabase
    .from("devicetable")
    .select("userid")
    .eq("macaddress", macaddress)
    .single();

  if (!device) throw { status: 404, message: "Device not found" };

  const { data: users } = await supabase
    .from("usertable")
    .select("id, name, common_name , client_key, client_crt")
    .eq("id", device.userid)
    .limit(1);

  if (!users.length) throw { status: 404, message: "User not found" };

  const { data: macs } = await supabase
    .from("devicetable")
    .select("macaddress")
    .eq("userid", device.userid);

  const { data: caRow, error: caErr } = await supabase
    .from("ca")
    .select("ca_cert")
    .limit(1)
    .single();
  if (caErr || !caRow) throw new Error("CA cert not found");

  return {
    userid: users[0].id,
    name: users[0].name,
    common_name: users[0].common_name,
    macaddresses: macs.map((device) => device.macaddress),
    ca_cert: caRow.ca_cert,
    client_key: users[0].client_key,
    client_crt: users[0].client_crt,
  };
};
