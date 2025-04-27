// lib/supabase-client.ts
// This file configures and exports the Supabase client for browser usage

import { createClient } from '@supabase/supabase-js';

// Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Type definitions for database tables
export type Resume = {
  id: string;
  user_id: string;
  original_text: string;
  optimized_text: string;
  language: string;
  ats_score: number;
  file_url?: string;
  selected_template: string;
  created_at: string;
  updated_at: string;
};

// Create a Supabase client for client-side usage with anonymous key
// This client has limited permissions based on RLS (Row Level Security) policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to get the authenticated user's ID from Supabase auth
export async function getAuthenticatedUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// Helper function to handle common Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error);
  
  // Common error messages translated to user-friendly format
  if (error?.message?.includes('not found')) {
    return 'The requested resource was not found.';
  } else if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
    return 'Database table not found. Please contact support.';
  } else if (error?.message?.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }
  
  return 'An unexpected error occurred.';
}