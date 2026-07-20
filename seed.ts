import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedAdmin() {
  console.log("Creating admin user.....");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'ahmadrahahleh091@gmail.com',
    password: 'Rossi90900$$',
    email_confirm: true,
  });

  let userId = data?.user?.id;

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log("User already exists! Fetching user ID...");
      // Fetch the user ID by using listUsers or via auth API
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === 'ahmadrahahleh091@gmail.com');
      if (existingUser) {
        userId = existingUser.id;
      }
    } else {
      console.error("Error creating user:", error);
      return;
    }
  } else {
    console.log("Admin user created successfully.....:", userId);
  }

  if (userId) {
    // Insert into profiles
    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: userId,
      name: 'أحمد الرحاحلة',
      role: 'admin',
      phone: '0790000000'
    }]);

    if (profileError) {
      console.error("Error creating profile:", profileError);
    } else {
      console.log("Admin profile created/updated successfully!");
    }
  }
}

async function seedTenant() {
  console.log("Creating tenant user...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'alazurri06@gmail.com',
    password: 'Rossi90900$$',
    email_confirm: true,
  });

  let userId = data?.user?.id;

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log("Tenant user already exists! Fetching user ID...");
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === 'alazurri06@gmail.com');
      if (existingUser) {
        userId = existingUser.id;
      }
    } else {
      console.error("Error creating tenant user:", error);
      return;
    }
  } else {
    console.log("Tenant user created successfully:", userId);
  }

  if (userId) {
    // Insert into profiles
    const { error: profileError } = await supabase.from('profiles').upsert([{
      id: userId,
      name: 'عبد الله الساكن',
      role: 'tenant',
      phone: '0791234567'
    }]);

    if (profileError) {
      console.error("Error creating tenant profile:", profileError);
    } else {
      console.log("Tenant profile created/updated successfully!");
    }

    // Link to an apartment (e.g. apartment 101 or 1)
    const { data: apts } = await supabase.from('apartments').select('*').limit(1);
    if (apts && apts.length > 0) {
      const { error: aptError } = await supabase.from('apartments').update({ tenant_id: userId }).eq('id', apts[0].id);
      if (aptError) {
        console.error("Error updating apartment:", aptError);
      } else {
        console.log(`Linked tenant to apartment ${apts[0].number}`);
      }
    } else {
      // Create apartment 101
      const { error: aptError } = await supabase.from('apartments').insert([{
        number: '101',
        floor: 1,
        tenant_id: userId
      }]);
      if (aptError) {
        console.error("Error creating apartment 101:", aptError);
      } else {
        console.log("Created apartment 101 and linked tenant.");
      }
    }
  }
}

async function runSeed() {
  await seedAdmin();
  await seedTenant();
}

runSeed();
