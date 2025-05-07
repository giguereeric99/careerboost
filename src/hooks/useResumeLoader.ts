/**
 * useResumeLoader.ts
 * 
 * Enhanced hook for loading resume data with improved error handling and
 * prevention of infinite loading loops. This hook handles the fetching
 * of resume data for a specific user while implementing safeguards
 * against redundant API calls.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getLatestOptimizedResume } from '@/services/resumeService';

/**
 * Custom hook for loading resume data with improved error handling
 * Prevents infinite loading loops when no resume exists by tracking load attempts
 * 
 * @param userId - The user identifier, can be null or undefined
 * @returns Object containing loading state, resume data, and functions
 */
export function useResumeLoader(userId: string | null | undefined) {
  // Status state - tracks whether resume is currently being loaded
  const [isLoading, setIsLoading] = useState(false);
  
  // Data state - holds the resume data when loaded
  const [resumeData, setResumeData] = useState<any>(null);
  
  // Feature state - tracks whether user has any resumes (true, false, or null for unknown)
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  
  // NEW: State to track which user IDs we've already checked for resumes
  // This prevents redundant API calls for the same user
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set());
  
  // References to prevent infinite loops and track loading state
  const loadAttemptedRef = useRef(false);         // Tracks if we've attempted to load any resume
  const isLoadingRef = useRef(false);             // Prevents concurrent loading operations
  const lastUserIdRef = useRef<string | null | undefined>(null);  // Tracks last loaded user ID
  const loadAttemptsRef = useRef(0);              // NEW: Tracks number of load attempts to limit retries
  const MAX_LOAD_ATTEMPTS = 2;                    // NEW: Maximum number of load attempts per user
  
  /**
   * Load the latest resume for the specified user
   * Includes safeguards against infinite loading loops
   * 
   * @param userIdToLoad - User ID to load resume for
   * @returns Promise resolving to resume data or null
   */
  const loadResume = useCallback(async (userIdToLoad: string) => {
    // Validate parameters - ensure we have a valid user ID
    if (!userIdToLoad) {
      console.log("Invalid userId provided to loadResume");
      return null;
    }
    
    // Skip if already loading - prevents concurrent operations
    if (isLoadingRef.current) {
      console.log("Resume loading already in progress, skipping duplicate request");
      return null;
    }
    
    // NEW: Check if we've already reached maximum attempts for this user
    if (checkedUserIds.has(userIdToLoad) && loadAttemptsRef.current >= MAX_LOAD_ATTEMPTS) {
      console.log(`Already attempted to load resume ${loadAttemptsRef.current} times for ${userIdToLoad}, skipping to prevent loops`);
      return null;
    }
    
    // NEW: Check if this is a repeat attempt for the same user, but allow limited retries
    if (loadAttemptedRef.current && userIdToLoad === lastUserIdRef.current) {
      // Increment attempt counter
      loadAttemptsRef.current += 1;
      
      // If we've exceeded max attempts, skip loading
      if (loadAttemptsRef.current > MAX_LOAD_ATTEMPTS) {
        console.log(`Maximum load attempts (${MAX_LOAD_ATTEMPTS}) reached for user ${userIdToLoad}`);
        return null;
      }
      
      console.log(`Retry attempt #${loadAttemptsRef.current} for user ${userIdToLoad}`);
    } else {
      // Reset attempt counter for new user ID
      loadAttemptsRef.current = 1;
    }
    
    // Set loading flags to prevent concurrent operations
    isLoadingRef.current = true;
    setIsLoading(true);
    
    // Track that we've attempted to load for this user
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
        
        // NEW: Add this userId to checked set even on error
        // This prevents repeated error states
        setCheckedUserIds(prev => new Set([...prev, userIdToLoad]));
        
        return null;
      }
      
      // If data exists, update state
      if (result.data) {
        console.log("Resume found for user:", result.data.id);
        setResumeData(result.data);
        setHasResume(true);
        
        // NEW: Add this userId to checked set on successful load
        setCheckedUserIds(prev => new Set([...prev, userIdToLoad]));
        
        // Reset attempt counter on success
        loadAttemptsRef.current = 0;
        
        return result.data;
      } else {
        // No resume found - expected for new users
        // This is a valid state, not an error condition
        console.log("No resume found for user - expected for new users");
        setHasResume(false);
        
        // NEW: Add this userId to checked set when no resume found
        // This prevents repeated checks for users without resumes
        setCheckedUserIds(prev => new Set([...prev, userIdToLoad]));
        
        return null;
      }
    } catch (error) {
      // Handle unexpected errors or timeout
      console.error("Error or timeout loading resume:", error);
      setHasResume(false);
      
      // NEW: Add this userId to checked set even on error
      setCheckedUserIds(prev => new Set([...prev, userIdToLoad]));
      
      return null;
    } finally {
      // Always reset loading flags
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [checkedUserIds]);
  
  /**
   * Effect to check for resume data when user ID changes
   * Only runs once per user ID to prevent infinite loops
   */
  useEffect(() => {
    // Skip if no user ID is provided
    if (!userId) {
      console.log("No userId provided, skipping resume load");
      return;
    }
    
    // Skip if already loading to prevent concurrent operations
    if (isLoadingRef.current) {
      console.log("Already loading, skipping additional load attempt");
      return;
    }
    
    // NEW: Skip loading if we've already checked this userId too many times
    if (checkedUserIds.has(userId) && loadAttemptsRef.current >= MAX_LOAD_ATTEMPTS) {
      console.log(`Already checked user ${userId} ${loadAttemptsRef.current} times, skipping to prevent loops`);
      return;
    }
    
    console.log("Checking for resume, userId changed to:", userId);
    
    // Load resume data for this user - only once or with limited retries
    const loadOnce = async () => {
      await loadResume(userId);
    };
    
    loadOnce();
    
    // Return cleanup function
    return () => {
      // No specific cleanup needed
    };
  }, [userId, loadResume, checkedUserIds]);
  
  /**
   * Force a new load attempt regardless of previous attempts
   * Useful for manual refresh or retry after errors
   * 
   * @param userIdToLoad - Optional userId to load, defaults to current userId
   * @returns Promise resolving to resume data or null
   */
  const resetAndLoad = useCallback(async (userIdToLoad?: string) => {
    // Reset the load attempted flag to force a new attempt
    loadAttemptedRef.current = false;
    
    // Reset attempt counter to allow new tries
    loadAttemptsRef.current = 0;
    
    // If userIdToLoad is provided, remove it from checked set to allow retry
    if (userIdToLoad) {
      setCheckedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userIdToLoad);
        return newSet;
      });
      
      return await loadResume(userIdToLoad);
    } else if (userId) {
      // Remove current userId from checked set
      setCheckedUserIds(prev => {
        const newSet = new Set(prev);
        if (userId) newSet.delete(userId);
        return newSet;
      });
      
      return await loadResume(userId);
    }
    
    return null;
  }, [userId, loadResume]);
  
  // Return hook interface with loading state, data, and functions
  return {
    isLoading,
    resumeData,
    hasResume,
    loadResume,
    resetLoadState: resetAndLoad,
    // NEW: Expose attempt information for debugging
    loadAttempts: loadAttemptsRef.current,
    hasCheckedUser: userId ? checkedUserIds.has(userId) : false
  };
}

export default useResumeLoader;