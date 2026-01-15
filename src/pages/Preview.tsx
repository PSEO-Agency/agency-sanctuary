import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WebsiteShell from "@/components/preview/WebsiteShell";
import PreviewPageContent from "@/components/preview/PreviewPageContent";
import { Loader2 } from "lucide-react";

interface CampaignPage {
  id: string;
  title: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sections_content: any;
  data_values: Record<string, string>;
  campaign_id: string;
  preview_token: string;
}

interface Campaign {
  id: string;
  name: string;
  business_name: string | null;
  business_logo_url: string | null;
  template_config: any;
  preview_settings: any;
  data_columns: any;
}

interface SiblingPage {
  id: string;
  title: string;
  slug: string | null;
  preview_token: string;
  data_values: Record<string, string>;
}

export default function Preview() {
  const { token } = useParams<{ token: string }>();
  const [page, setPage] = useState<CampaignPage | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [siblingPages, setSiblingPages] = useState<SiblingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreviewData() {
      if (!token) {
        setError("No preview token provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch page by preview token
        const { data: pageData, error: pageError } = await supabase
          .from("campaign_pages")
          .select("*")
          .eq("preview_token", token)
          .single();

        if (pageError || !pageData) {
          setError("Preview not found or has expired");
          setLoading(false);
          return;
        }

        setPage({
          ...pageData,
          data_values: (pageData.data_values as Record<string, string>) || {},
          sections_content: pageData.sections_content || [],
        });

        // Fetch campaign data
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, name, business_name, business_logo_url, template_config, preview_settings, data_columns")
          .eq("id", pageData.campaign_id)
          .single();

        if (campaignError) {
          console.error("Error fetching campaign:", campaignError);
        } else {
          setCampaign(campaignData);
        }

        // Fetch sibling pages for navigation
        const { data: siblingsData, error: siblingsError } = await supabase
          .from("campaign_pages")
          .select("id, title, slug, preview_token, data_values")
          .eq("campaign_id", pageData.campaign_id)
          .neq("id", pageData.id)
          .order("title");

        if (siblingsError) {
          console.error("Error fetching siblings:", siblingsError);
        } else {
          setSiblingPages(
            (siblingsData || []).map((p) => ({
              ...p,
              data_values: (p.data_values as Record<string, string>) || {},
            }))
          );
        }
      } catch (err) {
        console.error("Preview fetch error:", err);
        setError("Failed to load preview");
      } finally {
        setLoading(false);
      }
    }

    fetchPreviewData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Preview Not Found</h1>
          <p className="text-muted-foreground">{error || "This preview link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <WebsiteShell
      campaign={campaign}
      currentPage={page}
      siblingPages={siblingPages}
    >
      <PreviewPageContent
        page={page}
        campaign={campaign}
      />
    </WebsiteShell>
  );
}
