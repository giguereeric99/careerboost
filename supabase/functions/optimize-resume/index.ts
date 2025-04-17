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
    const { resumeData } = await req.json();

    if (!resumeData) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
              You are a resume optimization expert. Analyze the provided resume data and provide:
              1. An optimized version of the resume with improved content
              2. A list of specific suggestions to improve the resume
              
              Return ONLY a JSON object with the following structure:
              {
                "optimizedData": {
                  // The improved resume data with the same structure as the input
                },
                "suggestions": [
                  {
                    "type": "keyword|achievement|format|language",
                    "text": "Short, specific suggestion text",
                    "impact": "Brief explanation of why this change matters"
                  }
                ]
              }
            `
          },
          {
            role: 'user',
            content: JSON.stringify(resumeData)
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await openaiResponse.json();
    const optimizedData = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify(optimizedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error optimizing resume:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});