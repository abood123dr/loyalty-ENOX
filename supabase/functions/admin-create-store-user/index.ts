import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_ADMIN_EMAIL = 'lamhatc1@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: requester, error: requesterError } = await supabase.auth.getUser(jwt);
    if (requesterError || requester.user?.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return Response.json({ error: 'Only the platform super admin can create store users' }, { status: 403, headers: corsHeaders });
    }

    const { email, password, name, role = 'store_owner', storeId } = await req.json();
    if (!email || !password || !storeId) {
      return Response.json({ error: 'email, password, and storeId are required' }, { status: 400, headers: corsHeaders });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        store_id: storeId,
      },
      app_metadata: {
        role,
        store_id: storeId,
      },
    });

    if (error) throw error;

    await supabase
      .from('stores')
      .update({
        owner_user_id: data.user.id,
        owner_email: normalizedEmail,
        owner_name: name,
      })
      .eq('id', storeId);

    return Response.json({ user: data.user }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
