import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file URL from Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Get file content from storage
    const fileResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/public/resume-files/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const fileContent = await fileResponse.text();

    // Process with OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
              You are a resume parsing expert. Extract structured information from the resume content provided.
              Return ONLY a JSON object with the following structure:
              {
                "fullName": string,
                "email": string,
                "phone": string,
                "location": string,
                "title": string,
                "summary": string,
                "skills": string[],
                "experience": [
                  {
                    "company": string,
                    "position": string,
                    "startDate": string,
                    "endDate": string,
                    "location": string,
                    "description": string[]
                  }
                ],
                "education": [
                  {
                    "institution": string,
                    "degree": string,
                    "field": string,
                    "startDate": string,
                    "endDate": string,
                    "gpa": string
                  }
                ],
                "certifications": string[]
              }
              If any field is not found, omit it from the JSON result.
            `
          },
          {
            role: 'user',
            content: fileContent
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await openaiResponse.json();
    const parsedData = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing resume:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});