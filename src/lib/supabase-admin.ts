// lib/supabase-admin.ts
// This file is for server-side only and exports the admin Supabase client

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Create a Supabase admin client with service role key
// WARNING: This bypasses RLS and should only be used in secure server contexts
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

// Function to ensure admin client exists
export function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized. SUPABASE_SERVICE_ROLE_KEY environment variable may be missing.');
  }
  return supabaseAdmin;
}

// Function to create a server-side Supabase client with cookies for auth
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set(name, value, options);
        },
        remove: (name, options) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};