import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const base64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const createPassKitJwt = async (key: string, secret: string) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { uid: key, iat: now, exp: now + 3600 };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(unsignedToken));
  return `${unsignedToken}.${base64Url(signature)}`;
};

const encodeSvgDataUrl = (svg: string) => {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};

const stampSymbol = (icon?: string) => ({
  star: '★',
  heart: '♥',
  coffee: '☕',
  gift: '◆',
  none: '',
  check: '✓',
}[icon || 'check'] || '✓');

const stampText = (store: Record<string, string | number | null>, customer: Record<string, string | number | null>) => {
  const current = Math.max(0, Number(customer.current_stamps) || 0);
  const total = Math.max(1, Math.min(Number(store.stamps_required) || 10, 20));
  const filled = stampSymbol(String(store.stamp_icon || 'check'));
  const empty = '○';
  const stamps = Array.from({ length: total })
    .map((_, index) => (index < current ? filled : empty))
    .join(' ');
  const reward = String(store.reward_description || '');
  return `الطوابع: ${stamps}\n${current} / ${total}${reward ? `\nالمكافأة: ${reward}` : ''}`;
};

const compactStampText = (store: Record<string, string | number | null>, customer: Record<string, string | number | null>) => {
  const current = Math.max(0, Number(customer.current_stamps) || 0);
  const total = Math.max(1, Math.min(Number(store.stamps_required) || 10, 12));
  return `${current}/${total} STAMPS`;
};

const tierIdForStamps = (
  baseTierId: string | null | undefined,
  store: Record<string, string | number | Record<string, string> | null>,
  customer: Record<string, string | number | null>,
) => {
  const required = Math.max(1, Number(store.stamps_required) || 5);
  const current = Math.max(0, Math.min(Number(customer.current_stamps) || 0, required));
  const tierMap = (store.passkit_stamp_tier_ids || {}) as Record<string, string>;
  const mappedTierId = tierMap[String(current)] || tierMap[current];

  if (mappedTierId) return mappedTierId;
  if (required !== 5) return baseTierId || null;
  if (current === 1) return baseTierId || 'base';
  return `stamp_${current}`;
};

const createStampProfileImage = (store: Record<string, string | number | null>, customer: Record<string, string | number | null>) => {
  const current = Math.max(0, Number(customer.current_stamps) || 0);
  const total = Math.max(1, Math.min(Number(store.stamps_required) || 10, 12));
  const bg = String(store.card_bg_color || '#7C3AED');
  const text = String(store.card_text_color || '#FFFFFF');
  const active = String(store.stamp_active_color || '#FFFFFF');
  const inactive = String(store.stamp_inactive_color || '#FFFFFF33');
  const symbol = stampSymbol(String(store.stamp_icon || 'check'));
  const circles = Array.from({ length: total }).map((_, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 70 + col * 60;
    const y = 118 + row * 54;
    const filled = index < current;
    return `
      <circle cx="${x}" cy="${y}" r="20" fill="${filled ? active : inactive}" stroke="${text}" stroke-opacity="0.55" stroke-width="2"/>
      ${filled && symbol ? `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="22" font-weight="700" fill="${bg}">${symbol}</text>` : ''}
    `;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <rect width="320" height="320" rx="34" fill="${bg}"/>
      <text x="160" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="${text}">STAMP CARD</text>
      <text x="160" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="${text}" opacity="0.78">${current} / ${total}</text>
      ${circles}
      <text x="160" y="288" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="${text}" opacity="0.86">${String(store.reward_description || '').slice(0, 34)}</text>
    </svg>
  `;
  return encodeSvgDataUrl(svg);
};

const customerEmail = (customer: Record<string, string | number | null>) =>
  customer.email || `customer-${String(customer.id).replace(/[^a-zA-Z0-9]/g, '')}@loyalty-enox.example.com`;

const uploadPassKitStripImage = async (apiBase: string, token: string, imageUrl?: string | null) => {
  if (!imageUrl) return null;

  const response = await fetch(`${apiBase}/images`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `stamp-strip-${Date.now()}`,
      imageData: {
        strip: imageUrl,
        thumbnail: imageUrl,
      },
    }),
  });

  if (!response.ok) {
    console.warn('PassKit image upload failed', await response.text());
    return null;
  }

  const body = await response.json().catch(() => ({}));
  return {
    strip: body.strip,
    thumbnail: body.thumbnail,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId, customerId } = await req.json();
    if (!storeId) {
      return Response.json({ error: 'storeId is required' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const restKey = Deno.env.get('PASSKIT_REST_KEY');
    const restSecret = Deno.env.get('PASSKIT_REST_SECRET');
    const apiBase = Deno.env.get('PASSKIT_API_BASE') || 'https://api.pub2.passkit.io';

    if (!restKey || !restSecret) {
      return Response.json({ error: 'PASSKIT_REST_KEY and PASSKIT_REST_SECRET are required' }, { status: 500, headers: corsHeaders });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,stamps_required,reward_description,card_bg_color,card_text_color,card_logo_url,logo_url,stamp_active_color,stamp_inactive_color,stamp_icon,stamp_strip_url,passkit_program_id,passkit_tier_id,passkit_stamp_tier_ids,passkit_enabled')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

    const { data: integration } = await supabase
      .from('passkit_integrations')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    const programId = integration?.program_id || store.passkit_program_id;
    const baseTierId = integration?.tier_id || store.passkit_tier_id;

    if (!programId) {
      return Response.json({ error: 'PassKit program_id is not configured for this store' }, { status: 400, headers: corsHeaders });
    }

    let customersQuery = supabase
      .from('store_customers')
      .select('id,full_name,phone,email,current_stamps,wallet_pass_id')
      .eq('store_id', storeId)
      .not('wallet_pass_id', 'is', null)
      .limit(500);

    if (customerId) {
      customersQuery = customersQuery.eq('id', customerId);
    }

    const { data: customers = [], error: customersError } = await customersQuery;
    if (customersError) throw customersError;

    const token = await createPassKitJwt(restKey, restSecret);
    const imageIds = await uploadPassKitStripImage(apiBase, token, store.stamp_strip_url);
    const results = [];

    for (const customer of customers) {
      const tierId = tierIdForStamps(baseTierId, store, customer);
      const payload = {
        id: customer.wallet_pass_id,
        programId,
        tierId,
        forename: customer.full_name,
        surname: 'Customer',
        mobileNumber: customer.phone,
        emailAddress: customerEmail(customer),
        person: {
          displayName: `${customer.full_name}  ${compactStampText(store, customer)}`,
          forename: customer.full_name,
          surname: 'Customer',
          emailAddress: customerEmail(customer),
          mobileNumber: customer.phone,
        },
        points: customer.current_stamps || 0,
        profileImage: store.stamp_strip_url || createStampProfileImage(store, customer),
        universal: {
          info: stampText(store, customer),
        },
        operation: 'OPERATION_PATCH',
        metaData: {
          storeId,
          customerId: customer.id,
          storeName: store.name,
          logoUrl: store.card_logo_url || store.logo_url || '',
          currentStamps: String(customer.current_stamps || 0),
          stampsRequired: String(store.stamps_required || 10),
          reward: store.reward_description || '',
          stampActiveColor: store.stamp_active_color || '#FFFFFF',
          stampInactiveColor: store.stamp_inactive_color || '#FFFFFF33',
          stampIcon: store.stamp_icon || 'check',
          stampStripUrl: store.stamp_strip_url || '',
        },
        passOverrides: {
          ...(imageIds ? { imageIds } : {}),
          colors: {
            backgroundColor: store.card_bg_color || '#7C3AED',
            labelColor: store.card_text_color || '#FFFFFF',
            textColor: store.card_text_color || '#FFFFFF',
            foregroundColor: store.card_text_color || '#FFFFFF',
          },
        },
      };

      const response = await fetch(`${apiBase}/members/member`, {
        method: 'PUT',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      let tierResponseOk = true;
      let tierResponseStatus = response.status;
      let tierResponseBody = {};
      if (response.ok && tierId) {
        const tierResponse = await fetch(`${apiBase}/members/member/tier`, {
          method: 'PUT',
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId: customer.wallet_pass_id,
            programId,
            tierId,
            eventDetails: {
              notes: `Stamp tier sync ${customer.current_stamps || 0}/${store.stamps_required || 5}`,
              metaData: {
                storeId,
                customerId: customer.id,
                currentStamps: String(customer.current_stamps || 0),
                stampsRequired: String(store.stamps_required || 5),
              },
            },
          }),
        });
        tierResponseOk = tierResponse.ok;
        tierResponseStatus = tierResponse.status;
        tierResponseBody = await tierResponse.json().catch(() => ({}));
      }

      results.push({
        customerId: customer.id,
        passId: customer.wallet_pass_id,
        tierId,
        ok: response.ok && tierResponseOk,
        status: response.ok ? tierResponseStatus : response.status,
        details: response.ok && tierResponseOk ? undefined : { memberUpdate: body, tierUpdate: tierResponseBody },
      });
    }

    const failed = results.filter(result => !result.ok);
    return Response.json({
      updated: results.length - failed.length,
      failed: failed.length,
      results,
    }, { status: failed.length ? 207 : 200, headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
