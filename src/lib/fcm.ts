import { supabase } from './supabase';

export interface FCMTokenRecord {
  id: string;
  user_id: string;
  device: string;
  token: string;
  created_at: string;
}

// Generates a mock FCM token structure similar to real Firebase Cloud Messaging
const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = 'fcm:APA91b';
  for (let i = 0; i < 130; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Gets the current device name based on User-Agent
export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  let browser = 'متصفح مجهول';
  let os = 'نظام تشغيل مجهول';

  // Detect OS
  if (ua.indexOf('Win') !== -1) os = 'ويندوز';
  else if (ua.indexOf('Mac') !== -1) os = 'ماك (macOS)';
  else if (ua.indexOf('X11') !== -1) os = 'لينكس';
  else if (ua.indexOf('Linux') !== -1) os = 'أندرويد / لينكس';
  else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'آيفون / آيباد';

  // Detect Browser
  if (ua.indexOf('Chrome') !== -1) browser = 'كروم (Chrome)';
  else if (ua.indexOf('Safari') !== -1) browser = 'سفاري (Safari)';
  else if (ua.indexOf('Firefox') !== -1) browser = 'فايرفوكس (Firefox)';
  else if (ua.indexOf('Edge') !== -1) browser = 'إيدج (Edge)';

  return `${browser} على ${os}`;
};

// Gets or generates the unique FCM Token for the current browser/device session
export const getOrGenerateCurrentToken = (): string => {
  let token = localStorage.getItem('current_fcm_token');
  if (!token) {
    token = generateSecureToken();
    localStorage.setItem('current_fcm_token', token);
  }
  return token;
};

// Local storage fallback for token registration if database table doesn't exist yet
const getLocalTokens = (): FCMTokenRecord[] => {
  try {
    const data = localStorage.getItem('local_fcm_tokens');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalTokens = (tokens: FCMTokenRecord[]) => {
  localStorage.setItem('local_fcm_tokens', JSON.stringify(tokens));
};

// Register/Upsert current device token into Supabase fcm_tokens table
export const registerDeviceTokenInDB = async (userId: string, customDevice?: string): Promise<{ success: boolean; token: string; source: 'supabase' | 'local'; error?: any }> => {
  const token = getOrGenerateCurrentToken();
  const device = customDevice || getDeviceName();

  if (!supabase) {
    // Local fallback
    const localTokens = getLocalTokens();
    const existingIndex = localTokens.findIndex(t => t.token === token);
    
    const newRecord: FCMTokenRecord = {
      id: existingIndex >= 0 ? localTokens[existingIndex].id : crypto.randomUUID(),
      user_id: userId,
      device,
      token,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      localTokens[existingIndex] = newRecord;
    } else {
      localTokens.push(newRecord);
    }
    saveLocalTokens(localTokens);
    return { success: true, token, source: 'local' };
  }

  try {
    // Check if table exists and upsert token
    const { error } = await supabase.from('fcm_tokens').upsert({
      user_id: userId,
      device,
      token,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'token'
    });

    if (error) {
      // If error is due to table missing (42P01 in postgres)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('fcm_tokens table does not exist in Supabase yet. Falling back to local token storage.');
        
        const localTokens = getLocalTokens();
        const existingIndex = localTokens.findIndex(t => t.token === token);
        const newRecord: FCMTokenRecord = {
          id: existingIndex >= 0 ? localTokens[existingIndex].id : crypto.randomUUID(),
          user_id: userId,
          device,
          token,
          created_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          localTokens[existingIndex] = newRecord;
        } else {
          localTokens.push(newRecord);
        }
        saveLocalTokens(localTokens);
        return { success: true, token, source: 'local' };
      }
      throw error;
    }

    return { success: true, token, source: 'supabase' };
  } catch (err: any) {
    console.error('Error in registerDeviceTokenInDB:', err);
    return { success: false, token, source: 'local', error: err };
  }
};

// Manually register a custom simulated device (for testing multiple tokens/devices per user)
export const registerSimulatedDeviceToken = async (userId: string, deviceName: string, customToken?: string): Promise<FCMTokenRecord> => {
  const token = customToken || generateSecureToken();
  
  if (supabase) {
    try {
      const { data, error } = await supabase.from('fcm_tokens').insert({
        user_id: userId,
        device: deviceName,
        token,
        created_at: new Date().toISOString()
      }).select().single();
      
      if (!error && data) {
        return data as FCMTokenRecord;
      }
    } catch (e) {
      console.warn('Could not insert simulated device to Supabase, fallback to local', e);
    }
  }

  // Local fallback
  const localTokens = getLocalTokens();
  const newRecord: FCMTokenRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    device: deviceName,
    token,
    created_at: new Date().toISOString()
  };
  localTokens.push(newRecord);
  saveLocalTokens(localTokens);
  return newRecord;
};

// Retrieve all tokens for all users (Admin view)
export const getAllRegisteredTokens = async (): Promise<FCMTokenRecord[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('fcm_tokens').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data as FCMTokenRecord[];
      }
    } catch (e) {
      console.warn('Could not fetch all tokens from Supabase, returning local tokens', e);
    }
  }
  return getLocalTokens();
};

// Retrieve tokens for a specific user
export const getUserTokens = async (userId: string): Promise<FCMTokenRecord[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('fcm_tokens').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (!error && data) {
        return data as FCMTokenRecord[];
      }
    } catch (e) {
      console.warn('Could not fetch user tokens from Supabase, filtering local tokens', e);
    }
  }
  return getLocalTokens().filter(t => t.user_id === userId);
};

// Delete a specific token (Logout/Unregister device)
export const unregisterDeviceToken = async (token: string): Promise<boolean> => {
  if (supabase) {
    try {
      const { error } = await supabase.from('fcm_tokens').delete().eq('token', token);
      if (!error) return true;
    } catch (e) {
      console.warn('Could not delete token from Supabase', e);
    }
  }
  const localTokens = getLocalTokens();
  const updated = localTokens.filter(t => t.token !== token);
  saveLocalTokens(updated);
  return true;
};

// Ensure every profile (user) in the system has at least one active token registered in Supabase
// This makes sure that even if they are not logged in right now on this device,
// notifications still successfully find their tokens and simulate delivery correctly during tests!
export const autoEnsureAllProfilesHaveTokens = async (profiles: any[]): Promise<void> => {
  if (!supabase || !profiles || profiles.length === 0) return;
  
  try {
    // Fetch all existing tokens
    const { data: existingTokens } = await supabase.from('fcm_tokens').select('user_id');
    const userIdsWithTokens = new Set(existingTokens?.map(t => t.user_id) || []);
    
    for (const profile of profiles) {
      if (!userIdsWithTokens.has(profile.id)) {
        console.log(`[FCM Automation] Generating and auto-registering simulated FCM token for user ${profile.name} (${profile.id})`);
        const simulatedToken = 'fcm:APA91b_auto_' + profile.id.substring(0, 8) + '_' + Math.random().toString(36).substring(2, 10);
        const deviceName = profile.role === 'admin' ? 'جهاز إداري (تلقائي)' : 'هاتف الساكن (تلقائي)';
        
        await supabase.from('fcm_tokens').insert({
          user_id: profile.id,
          device: deviceName,
          token: simulatedToken,
          created_at: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('Error in autoEnsureAllProfilesHaveTokens:', err);
  }
};

