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
const colorKey = (value: string | null | undefined) => String(value || '#4b2a25').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12);

const googleImage = (uri: string, label: string) => ({
  sourceUri: { uri },
  contentDescription: {
    defaultValue: {
      language: 'en-US',
      value: label,
    },
  },
});

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

const withVersion = (uri: string | null | undefined, version: string) => {
  if (!uri) return uri;
  const separator = uri.includes('?') ? '&' : '?';
  return `${uri}${separator}v=${encodeURIComponent(version)}`;
};

const isDirectImageUrl = (uri: string | null | undefined) => {
  if (!uri) return false;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(uri) || uri.includes('/storage/v1/object/public/');
};

const stampLine = (current: number, total: number) => {
  const cappedTotal = Math.max(1, Math.min(total || 10, 20));
  const filled = Math.max(0, Math.min(current || 0, cappedTotal));
  return `${'\u25cf '.repeat(filled)}${'\u25cb '.repeat(cappedTotal - filled)}`.trim();
};

const stampTierImage = (origin: string, current: number, total: number, templateUrl?: string | null) => {
  const tier = Math.max(0, Math.min(Number(current) || 0, Math.min(Number(total) || 5, 5)));
  if (templateUrl?.includes('{stamp}')) {
    return templateUrl.replaceAll('{stamp}', String(tier));
  }
  return `${origin}/wallet/stamp-tiers/stamp-${tier}.png`;
};

const merchantLocationsForStore = (store: Record<string, unknown>) => {
  if (!store.geofence_enabled) return [];
  const latitude = Number(store.latitude);
  const longitude = Number(store.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
  return [{ latitude, longitude }];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { storeId, customerId } = await req.json();
    if (!storeId) {
      return Response.json({ error: 'storeId is required' }, { status: 400, headers: corsHeaders });
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

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,updated_at,stamps_required,reward_description,card_bg_color,card_text_color,logo_url,card_logo_url,stamp_strip_url,geofence_enabled,latitude,longitude,geofence_message')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

    let customerQuery = supabase
      .from('store_customers')
      .select('id,full_name,phone,current_stamps,google_wallet_object_id')
      .eq('store_id', storeId)
      .not('google_wallet_object_id', 'is', null);
    if (customerId) customerQuery = customerQuery.eq('id', customerId);

    const { data: customers = [], error: customerError } = await customerQuery;
    if (customerError) throw customerError;

    const origin = origins[0]?.replace(/\/$/, '') || 'https://loyalty-enox.vercel.app';
    const total = store.stamps_required || 10;
    const defaultClassId = `${issuerId}.store_${safeId(store.id)}_${colorKey(store.card_bg_color)}`;
    const imageVersion = `${store.updated_at || Date.now()}-${Date.now()}`;
    const rawLogoUrl = isDirectImageUrl(store.card_logo_url)
      ? store.card_logo_url
      : isDirectImageUrl(store.logo_url)
        ? store.logo_url
        : `${origin}/wallet/stamp-tiers/preview.png`;
    const logoUrl = withVersion(rawLogoUrl, imageVersion);
    const classImageUrl = store.stamp_strip_url?.includes('{stamp}')
      ? store.stamp_strip_url.replaceAll('{stamp}', '0')
      : store.stamp_strip_url || `${origin}/wallet/stamp-tiers/stamp-0.png`;
    const defaultHeroUrl = withVersion(classImageUrl, imageVersion);
    const merchantLocations = merchantLocationsForStore(store);
    const classPayload = () => ({
      reviewStatus: 'UNDER_REVIEW',
      issuerName: store.name,
      programName: `${store.name} Rewards`,
      programLogo: googleImage(logoUrl, `${store.name} logo`),
      wideProgramLogo: googleImage(logoUrl, `${store.name} logo`),
      hexBackgroundColor: store.card_bg_color || '#4b2a25',
      ...(merchantLocations.length ? { merchantLocations } : {}),
      ...(defaultHeroUrl ? {
        heroImage: googleImage(defaultHeroUrl, `${store.name} stamp card`),
        imageModulesData: [
          {
            mainImage: googleImage(defaultHeroUrl, `${store.name} stamps`),
            id: 'stamp_design_class',
          },
        ],
      } : {}),
    });

    const token = await googleAccessToken(JSON.parse(serviceAccountJson));
    let updated = 0;
    let skipped = 0;
    const patchedClasses = new Set<string>();
    const classFailures: unknown[] = [];
    const failures: unknown[] = [];

    for (const customer of customers) {
      if (!customer.google_wallet_object_id || !String(customer.google_wallet_object_id).startsWith(`${issuerId}.`)) {
        skipped += 1;
        continue;
      }

      const current = customer.current_stamps || 0;
      const cardUrl = `${origin}/card/${store.slug}/${customer.id}`;
      const customerHeroUrl = withVersion(stampTierImage(origin, current, total, store.stamp_strip_url), `${imageVersion}-${customer.id}-${current}`);
      const existingObject = await walletRequest(`loyaltyObject/${encodeURIComponent(customer.google_wallet_object_id)}`, token);
      const classId = defaultClassId;

      if (!patchedClasses.has(classId)) {
        const existingClass = await walletRequest(`loyaltyClass/${encodeURIComponent(classId)}`, token);
        const classResponse = existingClass.status === 404
          ? await walletRequest('loyaltyClass', token, {
            method: 'POST',
            body: JSON.stringify({ id: classId, reviewStatus: 'UNDER_REVIEW', ...classPayload() }),
          })
          : await walletRequest(`loyaltyClass/${encodeURIComponent(classId)}`, token, {
            method: 'PATCH',
            body: JSON.stringify(classPayload()),
          });
        if (!classResponse.ok) {
          classFailures.push({ classId, details: classResponse.body });
        }
        patchedClasses.add(classId);
      }

      const objectPayload: Record<string, unknown> = {
        classId,
        loyaltyPoints: {
          label: 'Stamps',
          balance: { int: current },
        },
        textModulesData: [
          { id: 'stamp_progress', header: `${current}/${total} STAMPS`, body: stampLine(current, total) },
          { id: 'stamps', header: 'Stamps', body: `${current}/${total} stamps` },
          { id: 'reward', header: 'Reward', body: store.reward_description || `Collect ${total} stamps to unlock your reward.` },
          ...(store.geofence_message ? [{
            id: 'store_location',
            header: 'Nearby reminder',
            body: String(store.geofence_message).slice(0, 500),
          }] : []),
        ],
        ...(merchantLocations.length ? { merchantLocations } : {}),
        linksModuleData: {
          uris: [{ id: 'web_card', uri: cardUrl, description: 'Open digital card' }],
        },
      };
      if (customerHeroUrl) {
        objectPayload.heroImage = googleImage(customerHeroUrl, `${store.name} stamp card`);
        objectPayload.imageModulesData = [
          {
            mainImage: googleImage(customerHeroUrl, `${store.name} stamps`),
            id: 'stamp_design',
          },
        ];
      }

      const response = await walletRequest(`loyaltyObject/${encodeURIComponent(customer.google_wallet_object_id)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(objectPayload),
      });
      if (response.ok) {
        updated += 1;
      } else {
        failures.push({ customerId: customer.id, details: response.body });
      }
    }

    if (classFailures.length || failures.length) {
      return Response.json({ error: 'Some Google Wallet updates failed', updated, skipped, classFailures, failures }, { status: 207, headers: corsHeaders });
    }
    return Response.json({ updated, skipped, classesUpdated: patchedClasses.size }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
