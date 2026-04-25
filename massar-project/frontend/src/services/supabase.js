import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pkngqwjvekvolmirldgw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbmdxd2p2ZWt2b2xtaXJsZGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzIwOTcsImV4cCI6MjA5MDU0ODA5N30.LutR15fmnoyWtD4qMPp1srCTw7NdZcrkso4shfwMqyE';

export const supabase = createClient(supabaseUrl, supabaseKey);
