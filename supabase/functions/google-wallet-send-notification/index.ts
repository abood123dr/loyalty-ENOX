import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const base64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const signJwt = async (claims: Record<string, unknown>, privateKeyPem: string) => {
  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
};

const googleAccessToken = async (serviceAccount: Record<string, string>) => {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, serviceAccount.private_key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google OAuth failed: ${JSON.stringify(body)}`);
  return body.access_token as string;
};

const safeId = (value: string) => String(value || 'item').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80);

const walletRequest = async (path: string, token: string, options: RequestInit = {}) => {
  const response = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { storeId, customerId, title, message } = await req.json();
    if (!storeId) return Response.json({ error: 'storeId is required' }, { status: 400, headers: corsHeaders });
    if (!title || !message) return Response.json({ error: 'title and message are required' }, { status: 400, headers: corsHeaders });

    const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT_JSON');
    if (!issuerId || !serviceAccountJson) {
      return Response.json({ error: 'Google Wallet secrets are not configured' }, { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
    let query = supabase
      .from('store_customers')
      .select('id,full_name,google_wallet_object_id')
      .eq('store_id', storeId)
      .not('google_wallet_object_id', 'is', null);

    if (customerId) query = query.eq('id', customerId);

    const { data: customers = [], error } = await query;
    if (error) throw error;

    const token = await googleAccessToken(JSON.parse(serviceAccountJson));
    const failures: unknown[] = [];
    let sent = 0;
    let skipped = 0;

    for (const customer of customers) {
      const objectId = String(customer.google_wallet_object_id || '');
      if (!objectId.startsWith(`${issuerId}.`)) {
        skipped += 1;
        continue;
      }

      const response = await walletRequest(`loyaltyObject/${encodeURIComponent(objectId)}/addMessage`, token, {
        method: 'POST',
        body: JSON.stringify({
          message: {
            id: `notif_${Date.now()}_${safeId(customer.id).slice(0, 18)}`,
            header: String(title).slice(0, 80),
            body: String(message).slice(0, 500),
            messageType: 'TEXT_AND_NOTIFY',
          },
        }),
      });

      if (response.ok) {
        sent += 1;
      } else {
        failures.push({ customerId: customer.id, objectId, details: response.body });
      }
    }

    const payload = { sent, skipped, failed: failures.length, failures };
    if (failures.length) {
      return Response.json({ error: 'Some Google Wallet notifications failed', ...payload }, { status: 207, headers: corsHeaders });
    }
    return Response.json(payload, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
