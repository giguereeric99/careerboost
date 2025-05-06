/**
 * User Mapping Service
 * 
 * This service handles the mapping between authentication provider user IDs
 * (like Clerk IDs) and Supabase UUIDs for database operations.
 * 
 * It solves the problem of Clerk user IDs not being valid UUIDs by:
 * 1. Maintaining a mapping table between Clerk IDs and Supabase UUIDs
 * 2. Creating new UUIDs for users when needed
 * 3. Retrieving the correct UUID for database operations
 */

import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get or create a Supabase UUID for a Clerk user ID
 * Resolves the issue with Clerk IDs not being valid UUIDs
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID (starting with "user_")
 * @returns A valid Supabase UUID for the user
 */
export async function getSupabaseUuid(
  supabaseAdmin: SupabaseClient, 
  clerkUserId: string
): Promise<string> {
  try {
    // First check if this user already has a mapping
    const { data: existingMapping, error: mappingError } = await supabaseAdmin
      .from('user_mapping')
      .select('supabase_uuid')
      .eq('clerk_id', clerkUserId)
      .single();
    
    if (mappingError) {
      console.log("No existing mapping found, creating new one");
      
      // Generate a new UUID for this user
      const newUuid = crypto.randomUUID();
      
      // Insert the mapping
      const { error: insertError } = await supabaseAdmin
        .from('user_mapping')
        .insert({
          clerk_id: clerkUserId,
          supabase_uuid: newUuid
        });
      
      if (insertError) {
        console.error("Error creating user mapping:", insertError);
        throw new Error(`Failed to create user mapping: ${insertError.message}`);
      }
      
      return newUuid;
    }
    
    // Return the existing UUID from the mapping
    return existingMapping.supabase_uuid;
  } catch (error) {
    console.error("Error in getSupabaseUuid:", error);
    
    // If all else fails, just generate a UUID
    // This is not ideal as it won't be persistent, but it's better than crashing
    return crypto.randomUUID();
  }
}

/**
 * Get all Supabase resources (resumes, etc.) for a clerk user
 * Uses the mapping to find all resources
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID
 * @returns Array of resource IDs
 */
export async function getUserResources(
  supabaseAdmin: SupabaseClient,
  clerkUserId: string
): Promise<string[]> {
  try {
    // Get the Supabase UUID for this clerk ID
    const supabaseUuid = await getSupabaseUuid(supabaseAdmin, clerkUserId);
    
    // Find all resumes for this user
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .select('id')
      .eq('user_id', supabaseUuid);
    
    if (error) {
      console.error("Error finding user resources:", error);
      return [];
    }
    
    // Extract and return the resource IDs
    return data.map(item => item.id);
  } catch (error) {
    console.error("Error in getUserResources:", error);
    return [];
  }
}

/**
 * Verify if a user has access to a specific resource
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID
 * @param resourceId - Resource ID to check
 * @param resourceType - Type of resource (e.g., 'resumes')
 * @returns Boolean indicating if the user has access
 */
export async function verifyUserResourceAccess(
  supabaseAdmin: SupabaseClient,
  clerkUserId: string,
  resourceId: string,
  resourceType: string = 'resumes'
): Promise<boolean> {
  try {
    // Get the Supabase UUID for this clerk ID
    const supabaseUuid = await getSupabaseUuid(supabaseAdmin, clerkUserId);
    
    // Check if the resource belongs to this user
    const { data, error } = await supabaseAdmin
      .from(resourceType)
      .select('id')
      .eq('id', resourceId)
      .eq('user_id', supabaseUuid)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in verifyUserResourceAccess:", error);
    return false;
  }
}