import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with service role key (admin access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST handler to synchronize Clerk auth with Supabase
 * This creates a Supabase user and maps it to the Clerk user ID
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.log('Syncing auth for Clerk user:', clerkId);
    
    // Check if mapping already exists
    const { data: existingMapping, error: mappingError } = await supabaseAdmin
      .from('user_mapping')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    
    if (mappingError) {
      console.error('Error checking existing mapping:', mappingError);
      return NextResponse.json(
        { error: "Failed to check user mapping" },
        { status: 500 }
      );
    }
    
    // If mapping exists, return it
    if (existingMapping) {
      console.log('Existing mapping found:', existingMapping);
      return NextResponse.json({
        supabaseUuid: existingMapping.supabase_uuid,
        message: "User mapping already exists"
      });
    }
    
    // Create a new Supabase user
    // In a real implementation, you might want to create actual auth users
    // Here we're just generating a UUID for mapping purposes
    const newSupabaseUuid = crypto.randomUUID();
    
    // Create the mapping
    const { data: newMapping, error: insertError } = await supabaseAdmin
      .from('user_mapping')
      .insert({
        clerk_id: clerkId,
        supabase_uuid: newSupabaseUuid,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating user mapping:', insertError);
      return NextResponse.json(
        { error: "Failed to create user mapping" },
        { status: 500 }
      );
    }
    
    console.log('New mapping created:', newMapping);
    
    return NextResponse.json({
      supabaseUuid: newMapping.supabase_uuid,
      message: "User mapping created successfully"
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/auth/sync:', error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}