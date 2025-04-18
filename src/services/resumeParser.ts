import { supabase } from "@/integrations/supabase/client";

export type ResumeData = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  skills: string[];
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    location?: string;
    description: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
  }[];
  certifications?: string[];
};

export async function uploadResume(file: File): Promise<{ path: string; error: Error | null }> {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('resume-files')
      .upload(filePath, file);

    if (error) throw error;

    return { path: filePath, error: null };
  } catch (error: any) {
    console.error("Error uploading resume:", error);
    return { path: '', error };
  }
}

export async function parseResume(filePath: string): Promise<{ data: ResumeData | null; error: Error | null }> {
  try {
    // Call Supabase Edge Function to parse resume
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: { filePath },
    });

    if (error) throw error;
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return { data: null, error };
  }
}

export async function optimizeResume(resumeData: ResumeData): Promise<{ 
  optimizedData: ResumeData | null; 
  suggestions: { type: string; text: string; impact: string }[]; 
  error: Error | null 
}> {
  try {
    // Call Supabase Edge Function to optimize resume
    const { data, error } = await supabase.functions.invoke('optimize-resume', {
      body: { resumeData },
    });

    if (error) throw error;
    
    return { 
      optimizedData: data.optimizedData, 
      suggestions: data.suggestions, 
      error: null 
    };
  } catch (error: any) {
    console.error("Error optimizing resume:", error);
    return { 
      optimizedData: null, 
      suggestions: [], 
      error 
    };
  }
}
