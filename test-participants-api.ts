import { ParticipantsService } from './src/services/participants/participants.service';

async function testParticipantsApi() {
  const participantsService = new ParticipantsService();
  
  console.log('Testing Participants API...');
  
  // Test 1: Get participants (should return empty array initially)
  try {
    const result = await participantsService.getParticipants();
    console.log('Get participants:', result.data.length, 'participants found');
    console.log('First participant:', result.data[0]?.name || 'None');
  } catch (error) {
    console.error('Get participants failed:', error);
  }
  
  // Test 2: Create a participant
  try {
    const newParticipant = await participantsService.createParticipant({
      name: 'Test Participant',
      type: 'individual',
      role: 'Tester',
      company: 'Test Company',
      bio: 'This is a test participant',
      contacts: 'test@example.com',
      notes: 'Test notes',
      previous_episodes: [],
      program_id: '8ba80b5a-96e3-4df4-9929-721e12620ac0' // Using existing program ID
    });
    console.log('Create participant:', newParticipant.name, 'with ID:', newParticipant.id);
    
    // Test 3: Get the participant we just created
    try {
      const participant = await participantsService.getParticipantById(newParticipant.id);
      console.log('Get participant by ID:', participant?.name || 'Not found');
    } catch (error) {
      console.error('Get participant by ID failed:', error);
    }
    
    // Test 4: Update the participant
    try {
      const updatedParticipant = await participantsService.updateParticipant(newParticipant.id, {
        role: 'Senior Tester',
        bio: 'This is an updated test participant'
      });
      console.log('Update participant:', updatedParticipant?.role || 'Failed');
    } catch (error) {
      console.error('Update participant failed:', error);
    }
    
    // Test 5: Delete the participant
    try {
      const deleted = await participantsService.deleteParticipant(newParticipant.id);
      console.log('Delete participant:', deleted ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Delete participant failed:', error);
    }
    
  } catch (error) {
    console.error('Create participant failed:', error);
  }
}

testParticipantsApi().catch(console.error);