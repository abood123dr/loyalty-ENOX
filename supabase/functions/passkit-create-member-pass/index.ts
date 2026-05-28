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

const passUrlBaseFromApiBase = (apiBase: string) => {
  if (apiBase.includes('pub2')) return 'https://pub2.pskt.io/';
  return 'https://pub1.pskt.io/';
};

const readPassId = (body: Record<string, unknown>) => {
  const response = body.response as Record<string, unknown> | undefined;
  return body.id
    || body.memberId
    || body.passId
    || response?.id
    || response?.memberId
    || response?.passId;
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const restKey = Deno.env.get('PASSKIT_REST_KEY');
    const restSecret = Deno.env.get('PASSKIT_REST_SECRET');
    const apiBase = Deno.env.get('PASSKIT_API_BASE') || 'https://api.pub2.passkit.io';
    const passUrlBase = Deno.env.get('PASSKIT_PASS_URL_BASE') || passUrlBaseFromApiBase(apiBase);

    if (!restKey || !restSecret) {
      return Response.json({ error: 'PASSKIT_REST_KEY and PASSKIT_REST_SECRET are required' }, { status: 500, headers: corsHeaders });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,stamps_required,reward_description,passkit_program_id,passkit_tier_id,passkit_enabled')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('*')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();
    if (customerError) throw customerError;

    const { data: integration } = await supabase
      .from('passkit_integrations')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    const programId = integration?.program_id || store.passkit_program_id;
    const tierId = integration?.tier_id || store.passkit_tier_id;

    if (!programId) {
      return Response.json({ error: 'PassKit program_id is not configured for this store' }, { status: 400, headers: corsHeaders });
    }

    const token = await createPassKitJwt(restKey, restSecret);

    const externalId = `${store.slug}-${customer.id}`;
    const passkitPayload = {
      programId,
      tierId,
      externalId,
      forename: customer.full_name,
      surname: '',
      mobileNumber: customer.phone,
      emailAddress: customer.email,
      points: customer.current_stamps || 0,
      metaData: {
        storeId,
        customerId,
        currentStamps: String(customer.current_stamps || 0),
        stampsRequired: String(store.stamps_required || 10),
        reward: store.reward_description || '',
        dynamicUrl: `${req.headers.get('origin') || ''}/store/${store.slug}`,
      },
    };

    const passkitResponse = await fetch(`${apiBase}/members/member`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passkitPayload),
    });

    const passkitBody = await passkitResponse.json().catch(() => ({}));
    if (!passkitResponse.ok) {
      return Response.json({ error: 'PassKit request failed', details: passkitBody }, { status: passkitResponse.status, headers: corsHeaders });
    }

    const passId = readPassId(passkitBody);
    const passUrl = passkitBody.url
      || passkitBody.passUrl
      || passkitBody.passURL
      || passkitBody?.response?.url
      || passkitBody?.response?.passUrl
      || passkitBody?.response?.passURL
      || (passId ? `${passUrlBase.replace(/\/?$/, '/')}${passId}` : null);

    if (!passId) {
      return Response.json({ error: 'PassKit created a member but no pass id was returned', details: passkitBody }, { status: 502, headers: corsHeaders });
    }

    await supabase
      .from('store_customers')
      .update({
        wallet_pass_id: passId,
        wallet_pass_url: passUrl,
        wallet_type: 'both',
      })
      .eq('id', customerId);

    return Response.json({ passId, passUrl, raw: passkitBody }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
