import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and anon key
const supabaseUrl = 'https://oqzbjoldijuunicscyvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xemJqb2xkaWp1dW5pY3NjeXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTM5MzgsImV4cCI6MjA2ODU2OTkzOH0.9RRABx39WxoDUeFvgt515KNM5e6R-TgLgGTBK8LHREo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});