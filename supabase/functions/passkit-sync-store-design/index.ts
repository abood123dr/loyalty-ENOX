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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();
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
      .select('id,name,slug,stamps_required,reward_description,card_bg_color,card_text_color,passkit_program_id,passkit_tier_id,passkit_enabled')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

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

    const { data: customers = [], error: customersError } = await supabase
      .from('store_customers')
      .select('id,full_name,phone,email,current_stamps,wallet_pass_id')
      .eq('store_id', storeId)
      .not('wallet_pass_id', 'is', null)
      .limit(500);
    if (customersError) throw customersError;

    const token = await createPassKitJwt(restKey, restSecret);
    const results = [];

    for (const customer of customers) {
      const payload = {
        id: customer.wallet_pass_id,
        programId,
        tierId,
        forename: customer.full_name,
        surname: '',
        mobileNumber: customer.phone,
        emailAddress: customer.email,
        points: customer.current_stamps || 0,
        operation: 'OPERATION_PATCH',
        metaData: {
          storeId,
          customerId: customer.id,
          storeName: store.name,
          currentStamps: String(customer.current_stamps || 0),
          stampsRequired: String(store.stamps_required || 10),
          reward: store.reward_description || '',
        },
        passOverrides: {
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
      results.push({
        customerId: customer.id,
        passId: customer.wallet_pass_id,
        ok: response.ok,
        status: response.status,
        details: response.ok ? undefined : body,
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
