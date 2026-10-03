"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdmin = getSupabaseAdmin;
exports.getAuthenticatedUser = getAuthenticatedUser;
exports.checkSupabaseConnection = checkSupabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config");
let adminClient = null;
function getSupabaseAdmin() {
    const c = (0, config_1.getServerConfig)();
    if (!c.supabaseUrl || !c.supabaseServiceRoleKey) {
        throw new Error('Supabase server configuration is incomplete');
    }
    if (!adminClient) {
        adminClient = (0, supabase_js_1.createClient)(c.supabaseUrl, c.supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: { headers: { 'X-Client-Info': 'takemaster-v2-server' } },
        });
    }
    return adminClient;
}
async function getAuthenticatedUser(accessToken) {
    if (!accessToken)
        return null;
    const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
    if (error || !data.user)
        return null;
    return data.user;
}
async function checkSupabaseConnection() {
    const started = Date.now();
    try {
        const { error } = await getSupabaseAdmin().from('programs').select('id', { count: 'exact', head: true });
        return { connected: !error, latencyMs: Date.now() - started, error: error?.message };
    }
    catch (error) {
        return { connected: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
}
