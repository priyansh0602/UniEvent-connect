// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://olhcvwmtxbmazkyrwhgo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saGN2d210eGJtYXpreXJ3aGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTY2MjUsImV4cCI6MjA4ODA5MjYyNX0.sX2o5jOORWcLYIC4Mx1IpO5SFfAjqZG2zyAO8BvqnKs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);