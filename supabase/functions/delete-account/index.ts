import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey || !token) {
    return json({ error: "Not authenticated." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);

  if (userError || !user) {
    return json({ error: "Your session is no longer valid. Please sign in again." }, 401);
  }

  // Remove private/public objects that are not covered by database foreign keys.
  const { data: avatarObjects, error: avatarListError } = await admin.storage
    .from("avatars")
    .list(user.id, { limit: 100 });
  if (avatarListError) {
    console.error("Failed to list account avatar objects", avatarListError);
    return json({ error: "Could not remove account files. Please try again." }, 500);
  }
  if (avatarObjects?.length) {
    const { error: avatarDeleteError } = await admin.storage
      .from("avatars")
      .remove(avatarObjects.map((object) => `${user.id}/${object.name}`));
    if (avatarDeleteError) {
      console.error("Failed to delete account avatar objects", avatarDeleteError);
      return json({ error: "Could not remove account files. Please try again." }, 500);
    }
  }

  // Database records referencing auth.users must use ON DELETE CASCADE. The Auth
  // deletion is last so a relational failure leaves the account recoverable.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Failed to delete account", deleteError);
    return json({ error: "Could not delete your account. Please contact support if this continues." }, 500);
  }

  return json({ deleted: true }, 200);
});
