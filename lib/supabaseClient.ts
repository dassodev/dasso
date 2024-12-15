import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

// Remove any trailing spaces from the keys
const cleanUrl = supabaseUrl.trim();
const cleanKey = supabaseAnonKey.trim();

console.log('Supabase Configuration:', {
  url: cleanUrl,
  keyPrefix: cleanKey.substring(0, 20) + '...',  // Log only the start of the key for security
  keyLength: cleanKey.length,
  isKeyValid: cleanKey.startsWith('eyJ'),  // Basic validation check
});

const supabase = createClient(cleanUrl, cleanKey);

// Test the connection immediately
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase initialization error:', error);
  } else {
    console.log('Supabase initialized successfully');
  }
});

export { supabase }; 