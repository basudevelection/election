
const SUPABASE_URL = 'https://nslyproryuoffhuihzdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbHlwcm9yeXVvZmZodWloemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTc2MjksImV4cCI6MjA3ODY5MzYyOX0.keX3eiGVY_NmFSkGEbHAL3QSChFhj4jRPWPh56Ai1q0';

const { createClient } = window.supabase;
window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
