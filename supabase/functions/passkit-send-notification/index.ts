import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const base64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
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
    const { storeId, title, message, target = 'wallet', customerId } = await req.json();
    if (!storeId || !title || !message) {
      return Response.json({ error: 'storeId, title and message are required' }, { status: 400, headers: corsHeaders });
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
      .select('id,name,slug,passkit_program_id,passkit_enabled')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;
    if (!store.passkit_enabled || !store.passkit_program_id) {
      return Response.json({ error: 'PassKit is not configured for this store' }, { status: 400, headers: corsHeaders });
    }

    const { data: integration } = await supabase
      .from('passkit_integrations')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    const programId = integration?.program_id || store.passkit_program_id;
    let customersQuery = supabase
      .from('store_customers')
      .select('id,full_name,wallet_pass_id')
      .eq('store_id', storeId)
      .not('wallet_pass_id', 'is', null)
      .limit(500);

    if (customerId) {
      customersQuery = customersQuery.eq('id', customerId);
    }

    const { data: customers = [], error: customersError } = await customersQuery;
    if (customersError) throw customersError;

    const notificationText = `${title}\n${message}\n${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`;
    const token = await createPassKitJwt(restKey, restSecret);
    const results = [];

    for (const customer of customers) {
      const externalId = `${store.slug}-${customer.id}`;
      const response = await fetch(`${apiBase}/members/member`, {
        method: 'PUT',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          externalId,
          operation: 'OPERATION_PATCH',
          universal: {
            info: notificationText,
          },
          metaData: {
            'universal.info': notificationText,
            storeId,
            customerId: customer.id,
            notificationTitle: title,
            notificationMessage: message,
            notificationSentAt: new Date().toISOString(),
          },
        }),
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
    const sentCount = results.length - failed.length;
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        store_id: storeId,
        title,
        message,
        type: customerId ? 'personal' : target,
        target: customerId ? customerId : target,
        sent_count: sentCount,
        status: failed.length ? 'partial' : 'sent',
      })
      .select()
      .single();
    if (notificationError) throw notificationError;

    return Response.json({
      notification,
      sentCount,
      failed: failed.length,
      results,
    }, { status: failed.length ? 207 : 200, headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
