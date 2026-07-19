import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = Number(process.env.PORT) || 3000;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabaseAdmin: any = null;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  // Set up email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Cron job to run every hour to check for upcoming meetings in the next 24 hours
  cron.schedule('0 * * * *', async () => {
    if (!supabaseAdmin) return;
    try {
      console.log('Checking for upcoming meetings...');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: meetings, error } = await supabaseAdmin
        .from('meetings')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', tomorrow.toISOString());

      if (error) throw error;

      if (meetings && meetings.length > 0) {
        // Fetch all tenants
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        if (!users || !users.users) return;

        for (const meeting of meetings) {
          // Check if we already sent an email for this meeting (To prevent spamming every hour, 
          // a real app would use a 'reminder_sent' boolean column. For demonstration, we'll log it)
          console.log(`Upcoming meeting found: ${meeting.title}`);
          
          for (const user of users.users) {
            if (!user.email) continue;
            
            // Note: In a real environment, uncomment to send actual emails.
            // Using console.log here to simulate it since SMTP might not be configured.
            console.log(`[Email Mock] Sending reminder to ${user.email} for meeting: ${meeting.title}`);
            
            /* 
            if (process.env.SMTP_USER) {
              await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: `تذكير: ${meeting.title}`,
                text: `مرحباً،\nنذكركم بموعد الاجتماع القادم: ${meeting.title}\nالموعد: ${new Date(meeting.scheduled_at).toLocaleString('ar-JO')}\n\nشكراً لكم.`
              });
            }
            */
          }
        }
      }
    } catch (err) {
      console.error('Error in cron job:', err);
    }
  });

  // Admin endpoint to create new tenants
  app.post("/api/admin/users", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin is not configured. Please add SUPABASE_SERVICE_ROLE_KEY." });
    
    const { email, password, name, phone, role, apartmentNumber, floor } = req.body;
    
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) throw error;
      
      const userId = data.user.id;

      // Update profile
      await supabaseAdmin.from('profiles').insert([
        { id: userId, name, phone, role }
      ]);

      if (apartmentNumber) {
        // Check if apartment exists
        const { data: existingApt } = await supabaseAdmin.from('apartments').select('id').eq('number', apartmentNumber).single();
        if (existingApt) {
           await supabaseAdmin.from('apartments').update({ tenant_id: userId }).eq('id', existingApt.id);
        } else {
           await supabaseAdmin.from('apartments').insert([
             { number: apartmentNumber, floor, tenant_id: userId }
           ]);
        }
      }

      res.json({ success: true, user: data.user });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message });
    }
  });

  // Supabase Edge Function style endpoint to send automatic service fee email alerts
  app.post("/api/supabase/service-fees-reminder", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin is not configured. Please define SUPABASE_SERVICE_ROLE_KEY." });

    try {
      console.log('Running service fee reminder notification...');
      const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long' });

      // 1. Fetch all tenants
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'tenant');

      if (profError) throw profError;

      // 2. Fetch paid payments for current month
      const { data: payments, error: payError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('payment_month', currentMonthStr)
        .eq('verification_status', 'verified');

      if (payError) throw payError;

      const paidTenantIds = new Set(payments?.map(p => p.tenant_id) || []);
      const unpaidTenants = profiles?.filter(p => !paidTenantIds.has(p.id)) || [];

      console.log(`Found ${unpaidTenants.length} tenants with unpaid service fees for ${currentMonthStr}`);

      const sentEmails: string[] = [];

      for (const tenant of unpaidTenants) {
        // Fetch tenant auth email
        const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.getUserById(tenant.id);
        if (authError || !authUserData || !authUserData.user || !authUserData.user.email) {
          console.warn(`Could not get email for tenant: ${tenant.name}`);
          continue;
        }

        const email = authUserData.user.email;
        console.log(`[Edge Function Email] Sending service fee reminder to ${email} for ${currentMonthStr}`);

        if (process.env.SMTP_USER) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_USER,
              to: email,
              subject: `تذكير: استحقاق رسوم الخدمات لشهر ${currentMonthStr}`,
              text: `مرحباً ${tenant.name}،\n\nنود تذكيركم بموعد دفع رسوم الخدمات لشهر ${currentMonthStr}.\n\nالرجاء السداد من خلال لوحة التحكم الخاصة بكم لتجنب تراكم المبالغ.\n\nمع تحيات إدارة العمارة.`
            });
            sentEmails.push(email);
          } catch (mailErr) {
            console.error(`Failed to send email to ${email}:`, mailErr);
          }
        } else {
          sentEmails.push(`${email} (Simulated)`);
        }
      }

      res.json({ success: true, message: `Sent reminders to ${unpaidTenants.length} tenants.`, emails: sentEmails });
    } catch (err: any) {
      console.error('Error sending service fee reminders:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Daily cron job at 9:00 AM as a fail-safe scheduler for service fee reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('Automatically checking service fee due dates...');
    try {
      if (!supabaseAdmin) return;
      const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long' });
      const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('role', 'tenant');
      const { data: payments } = await supabaseAdmin.from('payments').select('*').eq('payment_month', currentMonthStr).eq('verification_status', 'verified');
      if (!profiles || !payments) return;

      const paidTenantIds = new Set(payments.map(p => p.tenant_id));
      const unpaidTenants = profiles.filter(p => !paidTenantIds.has(p.id));

      for (const tenant of unpaidTenants) {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(tenant.id);
        if (authUserData && authUserData.user && authUserData.user.email) {
          const email = authUserData.user.email;
          console.log(`[Cron Auto-Alert] Sending service fee reminder to ${email}`);
          if (process.env.SMTP_USER) {
            await transporter.sendMail({
              from: process.env.SMTP_USER,
              to: email,
              subject: `تذكير تلقائي: استحقاق رسوم الخدمات لشهر ${currentMonthStr}`,
              text: `مرحباً ${tenant.name}،\n\nيرجى العلم بأن الاشتراك الشهري لشهر ${currentMonthStr} مستحق السداد.\n\nتفضلوا بقبول الاحترام.`
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in daily service fee reminder cron job:', err);
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
