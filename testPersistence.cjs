const { SupabasePersistence } = require('./src/server/supabasePersistence');

async function testPersistence() {
  try {
    const persistence = new SupabasePersistence();
    
    console.log('Testing getShows...');
    const shows = await persistence.getShows();
    console.log('Shows:', shows);
    
    console.log('Testing getGuests...');
    const guests = await persistence.getGuests();
    console.log('Guests:', guests);
    
    console.log('Testing getEpisodes...');
    const episodes = await persistence.getEpisodes();
    console.log('Episodes:', episodes);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPersistence();