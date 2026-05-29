import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wwoeusyaiqnklgnzdwmh.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3b2V1c3lhaXFua2xnbnpkd21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODgwODMsImV4cCI6MjA5NTU2NDA4M30.ZbCgIC_UeuMi5ItXrE0-B2c0_zlSejULILlbecvsjRc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_NAMES = {
  Store: 'stores',
  StoreCustomer: 'store_customers',
  StampScan: 'stamp_scans',
  Notification: 'notifications',
  Branch: 'branches',
  Business: 'businesses',
  Campaign: 'campaigns',
  Customer: 'customers',
  LoyaltyCard: 'loyalty_cards',
  Reward: 'rewards',
  Transaction: 'transactions',
  PassKitIntegration: 'passkit_integrations',
};

const resolveTableName = (entityName) => TABLE_NAMES[entityName] || entityName;

const applyListOptions = (query, sort = '-created_at', limit) => {
  if (sort) {
    const ascending = !sort.startsWith('-');
    const column = sort.replace(/^-/, '') === 'created_date'
      ? 'created_at'
      : sort.replace(/^-/, '');
    query = query.order(column, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  return query;
};

// ===== AUTH =====
const auth = {
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  logout: async () => {
    await supabase.auth.signOut();
  },
  register: async (emailOrPayload, passwordArg, metadataArg = {}) => {
    const payload = typeof emailOrPayload === 'object'
      ? emailOrPayload
      : { email: emailOrPayload, password: passwordArg, metadata: metadataArg };

    const { email, password, metadata = {} } = payload;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) throw error;
    return data;
  },
  verifyOtp: async ({ email, otpCode, type = 'signup' }) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type });
    if (error) throw error;
    return data?.session || data;
  },
  resendOtp: async (email, type = 'signup') => {
    const { data, error } = await supabase.auth.resend({ email, type });
    if (error) throw error;
    return data;
  },
  loginWithProvider: async (provider, redirectTo = '/') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) throw error;
    return data;
  },
  resetPasswordRequest: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  },
  resetPassword: async ({ newPassword }) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },
  setToken: async (accessToken, refreshToken) => {
    if (!refreshToken) return;
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data;
  },
  createStoreUser: async ({ email, password, name, role = 'owner', storeId }) => {
    const { data, error } = await supabase.functions.invoke('admin-create-store-user', {
      body: { email, password, name, role, storeId },
    });
    if (error) throw error;
    return data;
  },
};

// ===== ENTITIES (قاعدة البيانات) =====
const createEntity = (entityName) => {
  const tableName = resolveTableName(entityName);

  return {
  filter: async (filters = {}, sort, limit) => {
    let query = supabase.from(tableName).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    query = applyListOptions(query, sort, limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  get: async (id) => {
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (record) => {
    const { data, error } = await supabase.from(tableName).insert(record).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, record) => {
    const { data, error } = await supabase.from(tableName).update(record).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  list: async (sort, limit) => {
    const query = applyListOptions(supabase.from(tableName).select('*'), sort, limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  };
};

// ===== ENTITIES MAP =====
const entities = new Proxy({}, {
  get: (_, tableName) => createEntity(tableName),
});

// ===== FILE UPLOAD =====
const integrations = {
  Core: {
    UploadFile: async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
      return { file_url: publicUrl };
    },
  },
  PassKit: {
    syncStoreDesign: async ({ storeId }) => {
      const { data, error } = await supabase.functions.invoke('passkit-sync-store-design', {
        body: { storeId },
      });
      if (error) {
        if (error.context?.json) {
          const details = await error.context.json().catch(() => null);
          throw new Error(details?.error
            ? `${details.error}${details.details ? `: ${JSON.stringify(details.details)}` : ''}`
            : error.message);
        }
        throw error;
      }
      if (data?.failed) {
        throw new Error(`PassKit sync failed: ${JSON.stringify(data.results?.filter(result => !result.ok) || data)}`);
      }
      return data;
    },
    syncCustomerPass: async ({ storeId, customerId }) => {
      const { data, error } = await supabase.functions.invoke('passkit-sync-store-design', {
        body: { storeId, customerId },
      });
      if (error) {
        if (error.context?.json) {
          const details = await error.context.json().catch(() => null);
          throw new Error(details?.error
            ? `${details.error}${details.details ? `: ${JSON.stringify(details.details)}` : ''}`
            : error.message);
        }
        throw error;
      }
      if (data?.failed) {
        throw new Error(`PassKit sync failed: ${JSON.stringify(data.results?.filter(result => !result.ok) || data)}`);
      }
      return data;
    },
    createMemberPass: async ({ storeId, customerId }) => {
      const { data, error } = await supabase.functions.invoke('passkit-create-member-pass', {
        body: { storeId, customerId },
      });
      if (error) {
        if (error.context?.json) {
          const details = await error.context.json().catch(() => null);
          throw new Error(details?.error
            ? `${details.error}${details.details ? `: ${JSON.stringify(details.details)}` : ''}`
            : error.message);
        }
        throw error;
      }
      return data;
    },
    sendNotification: async ({ storeId, title, message, target = 'wallet', customerId }) => {
      const { data, error } = await supabase.functions.invoke('passkit-send-notification', {
        body: { storeId, title, message, target, customerId },
      });
      if (error) {
        if (error.context?.json) {
          const details = await error.context.json().catch(() => null);
          throw new Error(details?.error
            ? `${details.error}${details.details ? `: ${JSON.stringify(details.details)}` : ''}`
            : error.message);
        }
        throw error;
      }
      return data;
    },
  },
  GoogleWallet: {
    createPass: async ({ storeId, customerId }) => {
      const { data, error } = await supabase.functions.invoke('google-wallet-create-pass', {
        body: { storeId, customerId },
      });
      if (error) {
        if (error.context?.json) {
          const details = await error.context.json().catch(() => null);
          throw new Error(details?.error || error.message);
        }
        throw error;
      }
      return data;
    },
  },
};

export const db = { auth, entities, integrations };
export const base44 = db;
export default db;
export { supabase };
