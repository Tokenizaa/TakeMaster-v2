import { getSupabaseAdmin } from './src/server/supabase';

async function testSignIn() {
  const supabase = getSupabaseAdmin();

  // Try to sign in with host user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'host@example.com',
    password: 'SuperSecret123!'
  });

  if (error) {
    console.log('Sign in failed:', error.message);
    return false;
  }

  if (data.user) {
    console.log('Sign in successful for user:', data.user.email);
    console.log('User ID:', data.user.id);
    return true;
  }

  console.log('Sign in failed: No user data');
  return false;
}

testSignIn().then(result => {
  if (!result) process.exit(1);
});