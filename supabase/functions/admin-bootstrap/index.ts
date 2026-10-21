// DISABLED: this function used to seed the owner admin account with a hardcoded
// password. That was a security risk and has been removed. The owner account now
// lives only in the database; manage admin users via Supabase Auth + user_roles.
// The handler is kept (returning 410) so any previously deployed copy is replaced.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: false, error: "Gone" }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
