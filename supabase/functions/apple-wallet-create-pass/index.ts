import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requiredSecrets = [
  'APPLE_WALLET_PASS_TYPE_ID',
  'APPLE_WALLET_TEAM_ID',
  'APPLE_WALLET_CERT_PEM',
  'APPLE_WALLET_KEY_PEM',
  'APPLE_WALLET_WWDR_CERT_PEM',
  'PUBLIC_APP_ORIGIN',
];

const hasAppleConfig = () => requiredSecrets.every((name) => Deno.env.get(name));

const tokenFromSerial = async (serialNumber: string) => {
  const bytes = new TextEncoder().encode(`${serialNumber}:${crypto.randomUUID()}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId, customerId } = await req.json();

    if (!storeId || !customerId) {
      return Response.json(
        { error: 'storeId and customerId are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'Supabase service role is not configured' },
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('id, store_id, apple_wallet_serial_number')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();

    if (customerError || !customer) {
      return Response.json(
        { error: 'Customer not found for this store' },
        { status: 404, headers: corsHeaders },
      );
    }

    const serialNumber = customer.apple_wallet_serial_number || `enox-${customer.id}`;
    const authToken = await tokenFromSerial(serialNumber);
    const publicOrigin = Deno.env.get('PUBLIC_APP_ORIGIN') || '';
    const futurePassUrl = publicOrigin
      ? `${publicOrigin}/apple-wallet/passes/${encodeURIComponent(serialNumber)}.pkpass`
      : null;

    await supabase
      .from('store_customers')
      .update({
        apple_wallet_serial_number: serialNumber,
        apple_wallet_auth_token: authToken,
        apple_wallet_pass_url: futurePassUrl,
      })
      .eq('id', customerId);

    if (!hasAppleConfig()) {
      const missingSecrets = requiredSecrets.filter((name) => !Deno.env.get(name));
      return Response.json({
        configured: false,
        status: 'pending_certificate',
        serialNumber,
        passUrl: futurePassUrl,
        missingSecrets,
        message: 'Apple Wallet metadata is prepared. Add Apple certificates to enable .pkpass generation.',
      }, { headers: corsHeaders });
    }

    return Response.json({
      configured: false,
      status: 'signing_not_enabled_yet',
      serialNumber,
      passUrl: futurePassUrl,
      message: 'Apple Wallet certificates are present. The next step is enabling .pkpass signing.',
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unexpected error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
