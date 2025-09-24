// services/supabase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://fkllhukkyuylbvcnekkd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbGxodWtreXV5bGJ2Y25la2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc1NzcsImV4cCI6MjA3NDMwMzU3N30.wc1cx7Of-J2oYt99gzNXtDv6139DAoJpsUuy6f_XjSQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
