import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uujelykppkcpgcedhmox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1amVseWtwcGtjcGdjZWRobW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzIzMzMsImV4cCI6MjA3ODcwODMzM30.-vQgtTZ4nY3SHDE-jJ09p-notl0BfP-UVzmf3AI3Hhk'; // Replace with the actual anon key from Supabase API settings
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
