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
    
    // Check if this is a repeat attempt for the same user
    if (loadAttemptedRef.current && userIdToLoad === lastUserIdRef.current) {
      console.log("Already attempted to load resume for this user, skipping to prevent loops");
      return null;
    }
    
    // Set loading flags
    isLoadingRef.current = true;
    setIsLoading(true);
    
    // Mark that we've attempted to load for this user
    loadAttemptedRef.current = true;
    lastUserIdRef.current = userIdToLoad;
    
    try {
      console.log("Loading resume for user:", userIdToLoad);
      
      // Create a timeout to abort if this takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Resume loading timed out")), 5000);
      });
      
      // Load resume with timeout
      const result = await Promise.race([
        getLatestOptimizedResume(userIdToLoad),
        timeoutPromise
      ]) as { data: any, error: any };
      
      // Handle network or API errors
      if (result.error) {
        console.error("Error from resume service:", result.error);
        setHasResume(false);
        return null;
      }
      
      // If data exists, update state
      if (result.data) {
        console.log("Resume found for user:", result.data.id);
        setResumeData(result.data);
        setHasResume(true);
        return result.data;
      } else {
        // No resume found - expected for new users
        console.log("No resume found for user - expected for new users");
        setHasResume(false);
        return null;
      }
    } catch (error) {
      // Handle unexpected errors or timeout
      console.error("Error or timeout loading resume:", error);
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
    if (!userId) {
      console.log("No userId provided, skipping resume load");
      return;
    }
    
    if (isLoadingRef.current) {
      console.log("Already loading, skipping additional load attempt");
      return;
    }
    
    // Skip if already attempted for this user ID
    if (loadAttemptedRef.current && userId === lastUserIdRef.current) {
      console.log("Already attempted load for this user ID, skipping to prevent loops");
      return;
    }
    
    console.log("Checking for resume, userId changed to:", userId);
    
    // Load resume data for this user - only once
    const loadOnce = async () => {
      await loadResume(userId);
    };
    
    loadOnce();
    
    // Return cleanup function
    return () => {
      // No specific cleanup needed
    };
  }, [userId, loadResume]);
  
  /**
   * Force a new load attempt regardless of previous attempts
   * Useful for manual refresh
   */
  const resetAndLoad = useCallback(async (userIdToLoad?: string) => {
    // Reset the load attempted flag to force a new attempt
    loadAttemptedRef.current = false;
    
    // If userId provided, load for that user, otherwise use the current userId
    if (userIdToLoad) {
      return await loadResume(userIdToLoad);
    } else if (userId) {
      return await loadResume(userId);
    }
    
    return null;
  }, [userId, loadResume]);
  
  return {
    isLoading,
    resumeData,
    hasResume,
    loadResume,
    // Enhanced reset function that also reloads
    resetLoadState: resetAndLoad
  };
}

export default useResumeLoader;