import { useState, useEffect, useCallback, useRef } from 'react';
import { getLatestOptimizedResume } from '@/services/resumeService';

/**
 * Custom hook for loading resume data with improved error handling
 * Prevents infinite loading loops when no resume exists
 */
export function useResumeLoader(userId: string | null | undefined) {
  // State to track loading status
  const [isLoading, setIsLoading] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  
  // Refs to prevent loops
  const loadAttemptedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null | undefined>(null);
  
  /**
   * Load the latest resume for the specified user
   * Includes safeguards against infinite loading loops
   */
  const loadResume = useCallback(async (userIdToLoad: string) => {
    // Skip if already loading or no user ID
    if (!userIdToLoad || isLoadingRef.current) return null;
    
    // Set loading flags
    isLoadingRef.current = true;
    setIsLoading(true);
    
    try {
      console.log("Loading resume for user:", userIdToLoad);
      const { data, error } = await getLatestOptimizedResume(userIdToLoad);
      
      // Update loading attempt flag
      loadAttemptedRef.current = true;
      
      if (error) {
        throw error;
      }
      
      // If data exists, update state
      if (data) {
        setResumeData(data);
        setHasResume(true);
        return data;
      } else {
        // No resume found - set flag to prevent further attempts
        console.log("No resume found for user");
        setHasResume(false);
        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      // Mark as not having resume to prevent further attempts
      setHasResume(false);
      return null;
    } finally {
      // Always reset loading flags
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);
  
  /**
   * Effect to check for resume data when user ID changes
   * Only runs once per user ID to prevent infinite loops
   */
  useEffect(() => {
    // Skip if no user ID or already loading
    if (!userId || isLoadingRef.current) return;
    
    // Skip if already attempted for this user ID
    if (loadAttemptedRef.current && userId === lastUserIdRef.current) return;
    
    // Update the last user ID
    lastUserIdRef.current = userId;
    
    // Load resume data for this user
    loadResume(userId);
    
    // Return cleanup function
    return () => {
      // No specific cleanup needed
    };
  }, [userId, loadResume]);
  
  return {
    isLoading,
    resumeData,
    hasResume,
    loadResume,
    // Reset function to force a new load attempt
    resetLoadState: () => {
      loadAttemptedRef.current = false;
    }
  };
}

export default useResumeLoader;