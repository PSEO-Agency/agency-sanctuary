-- Create wordpress_connections table
CREATE TABLE wordpress_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id UUID NOT NULL REFERENCES subaccounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_wordpress_connections_subaccount ON wordpress_connections(subaccount_id);

-- Enable RLS
ALTER TABLE wordpress_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for wordpress_connections
CREATE POLICY "Users can view their subaccount connections"
  ON wordpress_connections FOR SELECT
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create connections in their subaccount"
  ON wordpress_connections FOR INSERT
  WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount connections"
  ON wordpress_connections FOR UPDATE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount connections"
  ON wordpress_connections FOR DELETE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Super admins can manage all connections"
  ON wordpress_connections FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their agency connections"
  ON wordpress_connections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM subaccounts
    WHERE subaccounts.id = wordpress_connections.subaccount_id
    AND subaccounts.agency_id = user_agency_id(auth.uid())
  ));

-- Create article_publications table
CREATE TABLE article_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subaccount_id UUID NOT NULL REFERENCES subaccounts(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES wordpress_connections(id) ON DELETE SET NULL,
  article_airtable_id TEXT NOT NULL,
  wordpress_post_id INTEGER NOT NULL,
  wordpress_post_url TEXT NOT NULL,
  publish_status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_article_publications_subaccount ON article_publications(subaccount_id);
CREATE INDEX idx_article_publications_article ON article_publications(article_airtable_id);

-- Enable RLS
ALTER TABLE article_publications ENABLE ROW LEVEL SECURITY;

-- RLS policies for article_publications
CREATE POLICY "Users can view their subaccount publications"
  ON article_publications FOR SELECT
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can create publications in their subaccount"
  ON article_publications FOR INSERT
  WITH CHECK (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can update their subaccount publications"
  ON article_publications FOR UPDATE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Users can delete their subaccount publications"
  ON article_publications FOR DELETE
  USING (subaccount_id = user_subaccount_id(auth.uid()));

CREATE POLICY "Super admins can manage all publications"
  ON article_publications FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can view their agency publications"
  ON article_publications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM subaccounts
    WHERE subaccounts.id = article_publications.subaccount_id
    AND subaccounts.agency_id = user_agency_id(auth.uid())
  ));

-- Trigger for updated_at on wordpress_connections
CREATE TRIGGER update_wordpress_connections_updated_at
  BEFORE UPDATE ON wordpress_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();