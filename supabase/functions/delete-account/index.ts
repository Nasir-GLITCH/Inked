// delete-account: permanently deletes the calling user's account.
//
// Why an edge function: deleting an auth user needs the secret key, which must
// never ship in the mobile app. The platform verifies the caller's JWT
// (verify_jwt = true); this handler then re-validates it with the auth server and
// deletes ONLY the user that token belongs to. The user id is never taken from
// the request body, so one user cannot delete another.
//
// Cascade: public.profiles rows are removed by the ON DELETE CASCADE foreign key.
// IMPORTANT: when storage buckets or other user-owned data are added, this
// function must also delete that data (see docs/DECISIONS.md, ADR-011).

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function readSecretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // Fall through to the legacy key below.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return json(401, { error: 'unauthorized' });
  }

  // Require an explicit confirmation flag so a stray request cannot delete an account.
  let body: { confirm?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  if (body.confirm !== true) {
    return json(400, { error: 'confirmation_required' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const secretKey = readSecretKey();
  if (!url || !secretKey) {
    console.error('delete-account: server is missing SUPABASE_URL or a secret key');
    return json(500, { error: 'server_misconfigured' });
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: userError } = await admin.auth.getUser(token);
  if (userError || !data.user) {
    return json(401, { error: 'unauthorized' });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    // Log the reason server-side only; never return internals to the client.
    console.error('delete-account: deleteUser failed', deleteError.message);
    return json(500, { error: 'delete_failed' });
  }

  return json(200, { deleted: true });
});
