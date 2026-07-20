import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let firebaseAdminApp: any = null;

function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;

  // Check if an app is already initialized to avoid duplicate initialization errors
  const apps = getApps();
  if (apps.length > 0) {
    firebaseAdminApp = apps[0];
    return firebaseAdminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      return firebaseAdminApp;
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
      return firebaseAdminApp;
    } catch (err) {
      console.error('Failed to initialize firebase-admin with separate keys:', err);
    }
  }

  // Real fallback with the Service Account provided by the user
  try {
    const hardcodedServiceAccount = {
      projectId: "fazaaapp-84fee",
      clientEmail: "firebase-adminsdk-foya5@fazaaapp-84fee.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIwtQ7QCvCAXhT\n1J3LnfMLKu3ZtweDxJJGN3KpwufR7wG58ATzYMPDBKiev+YGwWmVZn2iAlBKt+yK\nxXU9PEm5ghq53cxUX8edFb0rlPJLNoZkUQ4A8ByQfXqBuCkoAhR1KvrOBJqUIjeq\nuMsMwTXQ0zKh4zxnQUAxMcURZewkFMN8+CwyJqyZ7pgi0iOlBCqB4dhRJRZ6vAnA\nN12N/2y7fntUPHZQ6SJLIHWZxtIjks+jA6HpWrkE0QlAgjCSeDRltC7KXfCNTY0u\nCg0z1CdInED4hrQDHEHz+oQVhoJjwHt1RLUuxT0Z9wq9Kyd6EZ3kXvIW8mSjPImt\nTFcDQ4OdAgMBAAECggEACtRQ8htC4QBcTHABIl0poZYWEMg/NwaQ+gmpUpVJak5x\nXOV2Fudxgou19COXgGYe0GjKvm+lLh/1ZKzvEeJhJbO/cPw7tpIYveqmHXuM2wLH\ncBIxO7ANZ7vlB6n2n7UGWSWm3sW/zYgk/D1jR+kE1/gJ2KgId5dno4pdk36DJOpY\nquCJaHi4b6UghQ5Iy1SWe7ShJDHfsomGkzoYqp+GPTBgifkJAq7hzoYp6GTORMr8\nBUPCHaCYF70yYgC9aBMAxSGi2W/NuFMKOByjxAbdeQd6azPT3xoESsOBi/JPXur5\nlYMRpwD5TMrwRuWaKSLPXomOHdvEdiGgVCrbjQWe8QKBgQDsoxPK0SBa+X/LYKdo\nOutrrd6O8GiJUGBUhZgURgj4g6aU1+OZyaUP9DqlZzB3RztCh5tPn2yRDw7tqPn2\nDrHv8gxClsi+cFwBC5u/MGYgvpDlls84UmgArxa/YOKqMohvvJGySeBXiF1VlOZM\nrFTQ6mpanxpHGWWPE9UD1GhbBQKBgQDZMD6dABNS9sul/bHC3WoX48d1ZRq/UcjE\n7MBW50ZHE28ox9vZiyXc9tEemFPOPDap/qmf4MGOdrukVWuSHU0m7s4M+eewhEX6\n/cNEzfpUg5QtYosyJUbRrldI0ZF22YLWqosGs+Vky40y6xY6KEVQrLGe3FpX1w1d\nmyeFA3FZuQKBgBXva/dB+WjVdeYpWHtN8uKxZE8Fs/r+i19qXtWKRGyc74Uemgd4\nbKeU8RbCAPkdjj21ik0QLyUnKzAWmM0ZQZ9HZaGKjqMwkSa7p71KRD1GzPGrUBwd\nb2yYzlgBKCG0u3b4GN1ZAcW7a0NyoQJ8ewQ+post8mai0Qo5QWawetftAoGAGjvF\nlFkp/F9rAcW+7vanlfMhaICp1moeggrGwLh2uKcUSiy51XEFRcdaQwPLO6HySF5G\nRtVzC64zxAm9UIzRgN5fbRnSbnPLsCFusKTgk8zA3SqF/aya/UC9skH9/AkR0LQQ\nzuJz1tTvXTMgIC41ESWK3tFm6C1FpATVpS9hRaECgYEAlaNNyX7k7wuWcgyb8fwW\nB0IJAI3S8D84ZwIt4cZANl0g4eEp6fjlUANzrTvlW57fsVEOD0s064IFtg7dwwiz\nmzsxZTTI6N6MHGrHZIYZFZ29iUN+eIgiFKnjeP73TD3eT2XQtfcDZWdNFnOQXyce\nLn3LWWxKxbhBNQU5fP4CsP4=\n-----END PRIVATE KEY-----\n",
    };

    firebaseAdminApp = initializeApp({
      credential: cert(hardcodedServiceAccount)
    });
    console.log('[Push Server] Firebase Admin successfully initialized using the provided service account.');
    return firebaseAdminApp;
  } catch (err) {
    console.error('[Push Server] Failed to initialize firebase-admin using fallback service account:', err);
  }

  return null;
}

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

  // Endpoint to send real Firebase Cloud Messaging (FCM) Push Notifications
  app.post("/api/push/send", async (req, res) => {
    const { tokens, title, body, type } = req.body;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "Missing recipient tokens." });
    }

    console.log(`[Push Server] Request to send push notification to ${tokens.length} devices...`);

    const messagingApp = getFirebaseAdmin();
    if (!messagingApp) {
      console.warn('[Push Server] Firebase Admin is not fully configured on the server. Simulated push completed successfully.');
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "FCM is not fully configured on the server. Simulated delivery completed successfully." 
      });
    }

    try {
      const messaging = getMessaging(messagingApp);
      const validTokens = tokens.filter(tok => tok && tok.trim() !== "");
      
      if (validTokens.length === 0) {
        return res.json({ success: true, message: "No valid tokens to send to." });
      }

      const response = await messaging.sendEachForMulticast({
        tokens: validTokens,
        notification: {
          title: title || "تنبيه جديد",
          body: body || ""
        },
        data: {
          type: type || "general",
          click_action: "/Home/"
        },
        android: {
          priority: "high",
          notification: {
            sound: "default"
          }
        },
        webpush: {
          headers: {
            Urgency: "high"
          },
          notification: {
            title: title || "تنبيه جديد",
            body: body || "",
            icon: "/Home/icon.svg",
            badge: "/Home/icon.svg",
            dir: "rtl",
            lang: "ar-JO"
          },
          fcmOptions: {
            link: "/Home/"
          }
        }
      });

      console.log(`[Push Server] Real FCM Delivery Result:`, response);
      
      // Cleanup invalid tokens
      if (response.failureCount > 0 && supabaseAdmin) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              failedTokens.push(validTokens[idx]);
            }
          }
        });
        
        if (failedTokens.length > 0) {
          console.log(`[Push Server] Removing ${failedTokens.length} invalid/unregistered tokens from database...`);
          try {
            await supabaseAdmin.from('fcm_tokens').delete().in('token', failedTokens);
            console.log(`[Push Server] Successfully removed invalid tokens.`);
          } catch (dbErr) {
            console.error('[Push Server] Failed to remove invalid tokens from database:', dbErr);
          }
        }
      }

      res.json({ 
        success: true, 
        simulated: false, 
        successCount: response.successCount, 
        failureCount: response.failureCount,
        responses: response.responses 
      });
    } catch (err: any) {
      console.error('[Push Server] Failed to send real FCM push notifications:', err);
      res.status(500).json({ error: err.message });
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
