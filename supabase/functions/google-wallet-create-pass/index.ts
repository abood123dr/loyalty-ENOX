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
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const signJwt = async (claims: Record<string, unknown>, privateKeyPem: string) => {
  const header = { alg: 'RS256', typ: 'JWT' };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
};

const safeId = (value: string) => String(value || 'item').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80);

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
  if (!response.ok) {
    throw new Error(`Google OAuth failed: ${JSON.stringify(body)}`);
  }
  return body.access_token as string;
};

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

const googleImage = (uri: string, label: string) => ({
  sourceUri: { uri },
  contentDescription: {
    defaultValue: {
      language: 'en-US',
      value: label,
    },
  },
});

const withVersion = (uri: string | null | undefined, version: string) => {
  if (!uri) return uri;
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}v=${encodeURIComponent(version)}`;
};

const stampLine = (current: number, total: number) => {
  const cappedTotal = Math.max(1, Math.min(total || 10, 20));
  const filled = Math.max(0, Math.min(current || 0, cappedTotal));
  return `${'\u25cf '.repeat(filled)}${'\u25cb '.repeat(cappedTotal - filled)}`.trim();
};

const stampTierImage = (origin: string, current: number, total: number) => {
  const tier = Math.max(0, Math.min(Number(current) || 0, Math.min(Number(total) || 5, 5)));
  return `${origin}/wallet/stamp-tiers/stamp-${tier}.png`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId, customerId } = await req.json();
    if (!storeId || !customerId) {
      return Response.json({ error: 'storeId and customerId are required' }, { status: 400, headers: corsHeaders });
    }

    const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT_JSON');
    const origins = (Deno.env.get('GOOGLE_WALLET_ORIGINS') || 'https://loyalty-enox.vercel.app')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!issuerId || !serviceAccountJson) {
      return Response.json({ error: 'Google Wallet secrets are not configured' }, { status: 500, headers: corsHeaders });
    }
    if (!/^\d+$/.test(issuerId)) {
      return Response.json({
        error: 'GOOGLE_WALLET_ISSUER_ID must be the numeric Issuer ID from Google Wallet Console, not the alphanumeric merchant/account id.',
      }, { status: 500, headers: corsHeaders });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,updated_at,description,stamps_required,reward_description,card_bg_color,card_text_color,logo_url,card_logo_url,cover_url,stamp_strip_url')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('id,full_name,phone,current_stamps,total_stamps_earned,google_wallet_object_id')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();
    if (customerError) throw customerError;

    const origin = origins[0]?.replace(/\/$/, '') || 'https://loyalty-enox.vercel.app';
    const cardUrl = `${origin}/card/${customer.id}`;
    const classId = `${issuerId}.store_${safeId(store.id)}`;
    const generatedObjectId = `${issuerId}.customer_${safeId(customer.id.replaceAll('-', ''))}`;
    const objectId = String(customer.google_wallet_object_id || '').startsWith(`${issuerId}.`)
      ? customer.google_wallet_object_id
      : generatedObjectId;
    const total = store.stamps_required || 10;
    const current = customer.current_stamps || 0;
    const imageVersion = `${store.updated_at || Date.now()}-${Date.now()}`;
    const logoUrl = withVersion(store.card_logo_url || store.logo_url || `${origin}/wallet/stamp-tiers/preview.png`, imageVersion);
    const classHeroUrl = withVersion(store.stamp_strip_url || `${origin}/wallet/stamp-tiers/stamp-0.png`, imageVersion);
    const objectHeroUrl = withVersion(stampTierImage(origin, current, total), `${imageVersion}-${customer.id}-${current}`);

    const loyaltyClass = {
      id: classId,
      issuerName: store.name,
      programName: `${store.name} Rewards`,
      reviewStatus: 'UNDER_REVIEW',
      programLogo: googleImage(logoUrl, `${store.name} logo`),
      wideProgramLogo: googleImage(logoUrl, `${store.name} logo`),
      hexBackgroundColor: store.card_bg_color || '#4b2a25',
      ...(classHeroUrl ? {
        heroImage: googleImage(classHeroUrl, `${store.name} stamp card`),
        imageModulesData: [
          {
            mainImage: googleImage(classHeroUrl, `${store.name} stamps`),
            id: 'stamp_design_class',
          },
        ],
      } : {}),
    };

    const loyaltyObject = {
      id: objectId,
      classId,
      state: 'ACTIVE',
      accountId: customer.phone || customer.id,
      accountName: customer.full_name,
      barcode: {
        type: 'QR_CODE',
        value: cardUrl,
        alternateText: String(customer.id).slice(0, 10),
      },
      loyaltyPoints: {
        label: 'Stamps',
        balance: { int: current },
      },
      textModulesData: [
        {
          id: 'stamp_progress',
          header: `${current}/${total} STAMPS`,
          body: stampLine(current, total),
        },
        {
          id: 'stamps',
          header: 'Stamps',
          body: `${current}/${total} stamps`,
        },
        {
          id: 'reward',
          header: 'Reward',
          body: store.reward_description || `Collect ${total} stamps to unlock your reward.`,
        },
      ],
      linksModuleData: {
        uris: [
          {
            id: 'web_card',
            uri: cardUrl,
            description: 'Open digital card',
          },
        ],
      },
      ...(objectHeroUrl ? {
        heroImage: googleImage(objectHeroUrl, `${store.name} stamp card`),
        imageModulesData: [
          {
            mainImage: googleImage(objectHeroUrl, `${store.name} stamps`),
            id: 'stamp_design',
          },
        ],
      } : {}),
    };

    const accessToken = await googleAccessToken(serviceAccount);
    const existingClass = await walletRequest(`loyaltyClass/${encodeURIComponent(classId)}`, accessToken);
    if (existingClass.status === 404) {
      const createdClass = await walletRequest('loyaltyClass', accessToken, {
        method: 'POST',
        body: JSON.stringify(loyaltyClass),
      });
      if (!createdClass.ok) {
        return Response.json({ error: 'Google Wallet class creation failed', details: createdClass.body }, { status: 502, headers: corsHeaders });
      }
    } else if (existingClass.ok) {
      await walletRequest(`loyaltyClass/${encodeURIComponent(classId)}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(loyaltyClass),
      });
    } else if (!existingClass.ok) {
      return Response.json({ error: 'Google Wallet class lookup failed', details: existingClass.body }, { status: 502, headers: corsHeaders });
    }

    const existingObject = await walletRequest(`loyaltyObject/${encodeURIComponent(objectId)}`, accessToken);
    if (existingObject.status === 404) {
      const createdObject = await walletRequest('loyaltyObject', accessToken, {
        method: 'POST',
        body: JSON.stringify(loyaltyObject),
      });
      if (!createdObject.ok) {
        return Response.json({ error: 'Google Wallet object creation failed', details: createdObject.body }, { status: 502, headers: corsHeaders });
      }
    } else if (existingObject.ok) {
      loyaltyObject.classId = existingObject.body?.classId || classId;
      await walletRequest(`loyaltyObject/${encodeURIComponent(objectId)}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(loyaltyObject),
      });
    } else {
      return Response.json({ error: 'Google Wallet object lookup failed', details: existingObject.body }, { status: 502, headers: corsHeaders });
    }

    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      iss: serviceAccount.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      origins,
      payload: {
        loyaltyObjects: [{ id: objectId }],
      },
    }, serviceAccount.private_key);

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    await supabase
      .from('store_customers')
      .update({
        google_wallet_object_id: objectId,
        google_wallet_save_url: saveUrl,
        wallet_type: 'web',
      })
      .eq('id', customerId);

    return Response.json({ saveUrl, objectId, classId }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
