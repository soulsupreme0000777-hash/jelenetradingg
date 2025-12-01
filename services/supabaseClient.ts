import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwgtenxpwzwhhmpbjaeb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3Z3Rlbnhwd3p3aGhtcGJqYWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTYwNDIsImV4cCI6MjA4MDE3MjA0Mn0.6BsFQAB0xsk4od3omI7ZyF61ydOuU7M8PQGdNIUdAXw';

export const supabase = createClient(supabaseUrl, supabaseKey);