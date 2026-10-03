import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/server/supabasePersistence.js';

async function test() {
  console.log('Testing getShows...');
  const shows = await db.getShows();
  console.log('Shows:', shows);
  console.log('Testing getGuests...');
  const guests = await db.getGuests();
  console.log('Guests:', guests);
  console.log('Testing getEpisodes...');
  const episodes = await db.getEpisodes();
  console.log('Episodes:', episodes);
}

test().catch(err => {
  console.error('Error:', err);
});