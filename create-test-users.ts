import { getSupabaseAdmin } from './src/server/supabase';

async function createTestUsers() {
  const supabase = getSupabaseAdmin();

  // Create host user
  const hostResult = await supabase.auth.admin.createUser({
    email: 'host@example.com',
    password: 'SuperSecret123!',
    email_confirm: true,
    user_metadata: { name: 'Host User' }
  });

  // Create guest user
  const guestResult = await supabase.auth.admin.createUser({
    email: 'guest@example.com',
    password: 'GuestPass456!',
    email_confirm: true,
    user_metadata: { name: 'Guest User' }
  });

  console.log('Host user creation:', hostResult.error ? 'Failed' : 'Success');
  if (hostResult.error) console.log('Host error:', hostResult.error);
  
  console.log('Guest user creation:', guestResult.error ? 'Failed' : 'Success');
  if (guestResult.error) console.log('Guest error:', guestResult.error);
}

createTestUsers().catch(console.error);