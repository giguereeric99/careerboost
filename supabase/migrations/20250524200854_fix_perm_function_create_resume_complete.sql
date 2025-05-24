-- Grant permissions exactly like your other working functions
GRANT ALL ON FUNCTION "public"."create_resume_complete"(
  "p_clerk_id" "text", 
  "p_original_text" "text", 
  "p_optimized_text" "text", 
  "p_language" "text", 
  "p_ats_score" integer, 
  "p_file_url" "text", 
  "p_file_name" "text", 
  "p_file_type" "text", 
  "p_file_size" integer, 
  "p_ai_provider" "text", 
  "p_keywords" "text"[], 
  "p_suggestions" "jsonb", 
  "p_reset_last_saved_text" boolean
) TO "anon";

GRANT ALL ON FUNCTION "public"."create_resume_complete"(
  "p_clerk_id" "text", 
  "p_original_text" "text", 
  "p_optimized_text" "text", 
  "p_language" "text", 
  "p_ats_score" integer, 
  "p_file_url" "text", 
  "p_file_name" "text", 
  "p_file_type" "text", 
  "p_file_size" integer, 
  "p_ai_provider" "text", 
  "p_keywords" "text"[], 
  "p_suggestions" "jsonb", 
  "p_reset_last_saved_text" boolean
) TO "authenticated";

GRANT ALL ON FUNCTION "public"."create_resume_complete"(
  "p_clerk_id" "text", 
  "p_original_text" "text", 
  "p_optimized_text" "text", 
  "p_language" "text", 
  "p_ats_score" integer, 
  "p_file_url" "text", 
  "p_file_name" "text", 
  "p_file_type" "text", 
  "p_file_size" integer, 
  "p_ai_provider" "text", 
  "p_keywords" "text"[], 
  "p_suggestions" "jsonb", 
  "p_reset_last_saved_text" boolean
) TO "service_role";