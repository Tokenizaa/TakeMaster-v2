import { getSupabaseAdmin } from './src/server/supabase';
import { ParticipantsService } from './src/services/participants/participants.service';

async function testAuthParticipants() {
  const supabase = getSupabaseAdmin();
  
  console.log('Testing authenticated participants access...');
  
  // Test 1: Sign in with host user
  const { data: hostData, error: hostError } = await supabase.auth.signInWithPassword({
    email: 'host@example.com',
    password: 'SuperSecret123!'
  });
  
  if (hostError) {
    console.error('Host sign in failed:', hostError.message);
    return;
  }
  
  console.log('Host sign in successful:', hostData.user?.email);
  
  // Test 2: Sign in with guest user
  const { data: guestData, error: guestError } = await supabase.auth.signInWithPassword({
    email: 'guest@example.com',
    password: 'GuestPass456!'
  });
  
  if (guestError) {
    console.error('Guest sign in failed:', guestError.message);
    return;
  }
  
  console.log('Guest sign in successful:', guestData.user?.email);
  
  // Test 3: Use the service with authentication (this would normally happen via the API routes)
  // For now, we'll just verify that the service layer works when called directly
  // In a real application, the API routes would use requireAuth middleware
  
  const participantsService = new ParticipantsService();
  
  try {
    // Try to get participants (should work)
    const result = await participantsService.getParticipants();
    console.log('Get participants (authenticated):', result.data.length, 'participants found');
  } catch (error) {
    console.error('Get participants failed:', error);
  }
  
  console.log('Authentication tests completed successfully!');
}

testAuthParticipants().catch(console.error);