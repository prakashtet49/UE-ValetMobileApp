// Import URL polyfill for React Native compatibility
import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project configuration
const SUPABASE_URL = 'https://sqlgezrpdbjpbtbkwedb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGdlenJwZGJqcGJ0Ymt3ZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjgyMzMsImV4cCI6MjA3OTA0NDIzM30.EY2ZueU3YhaZvfMzsyxoY3IDa3xjx6moSMrdTz8-FIs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});

/**
 * Get the current Supabase session token
 * This is the token that should be used for WebSocket authentication
 */
export async function getSupabaseToken(): Promise<string | null> {
  try {
    const {data: {session}} = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[Supabase] Failed to get session:', error);
    return null;
  }
}

/**
 * Get the current Supabase user
 */
export async function getSupabaseUser() {
  try {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('[Supabase] Failed to get user:', error);
    return null;
  }
}
