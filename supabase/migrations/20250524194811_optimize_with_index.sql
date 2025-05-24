-- Index de performance pour CareerBoost
CREATE INDEX IF NOT EXISTS idx_resumes_user_created 
ON resumes(auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggestions_resume_applied 
ON resume_suggestions(resume_id, is_applied);

CREATE INDEX IF NOT EXISTS idx_keywords_resume_applied 
ON resume_keywords(resume_id, is_applied);

CREATE INDEX IF NOT EXISTS idx_user_mapping_active_users 
ON user_mapping(subscription_status, subscription_plan) 
WHERE subscription_status = 'active';