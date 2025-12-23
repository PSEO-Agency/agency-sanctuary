-- Add airtable_base_id to subaccounts table (one base per subaccount)
ALTER TABLE subaccounts 
ADD COLUMN airtable_base_id TEXT;

-- Modify blog_projects table: drop airtable_base_id, add new columns
ALTER TABLE blog_projects 
DROP COLUMN airtable_base_id;

ALTER TABLE blog_projects 
ADD COLUMN airtable_record_id TEXT,
ADD COLUMN language TEXT,
ADD COLUMN language_engine TEXT,
ADD COLUMN project_type TEXT DEFAULT 'Content';