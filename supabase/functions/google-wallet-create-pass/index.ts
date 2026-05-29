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

const localized = (value: string, language = 'ar-SA') => ({
  defaultValue: { language, value },
});

const image = (uri: string, label: string) => ({
  sourceUri: { uri },
  contentDescription: localized(label),
});

const publicImage = (url?: string | null) => {
  if (url && /^https:\/\//i.test(url)) return url;
  return 'https://www.gstatic.com/images/branding/product/1x/wallet_48dp.png';
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
      .select('id,name,slug,description,stamps_required,reward_description,card_bg_color,card_text_color,logo_url,card_logo_url,cover_url')
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
    const classId = `${issuerId}.store_${safeId(store.slug || store.id)}`;
    const objectId = customer.google_wallet_object_id || `${issuerId}.customer_${safeId(customer.id.replaceAll('-', ''))}`;
    const total = store.stamps_required || 10;
    const current = customer.current_stamps || 0;
    const logo = publicImage(store.card_logo_url || store.logo_url);
    const hero = publicImage(store.cover_url || store.card_logo_url || store.logo_url);

    const loyaltyClass = {
      id: classId,
      issuerName: store.name,
      reviewStatus: 'UNDER_REVIEW',
      programName: `${store.name} Rewards`,
      programLogo: image(logo, `${store.name} logo`),
      hexBackgroundColor: store.card_bg_color || '#4b2a25',
    };

    const loyaltyObject = {
      id: objectId,
      classId,
      state: 'ACTIVE',
      accountId: customer.phone || customer.id,
      accountName: customer.full_name,
      heroImage: image(hero, `${store.name} card image`),
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
    };

    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      iss: serviceAccount.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      origins,
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
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
