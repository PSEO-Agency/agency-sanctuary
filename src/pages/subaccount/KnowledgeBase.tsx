import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Building, MessageSquare, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KnowledgeBaseData {
  brand_name: string;
  tagline: string;
  brand_voice: string;
  industry: string;
  target_audience: string;
  key_differentiators: string;
  system_prompt: string;
  ai_agent_prompt: string;
}

const defaultData: KnowledgeBaseData = {
  brand_name: "",
  tagline: "",
  brand_voice: "professional",
  industry: "",
  target_audience: "",
  key_differentiators: "",
  system_prompt: "",
  ai_agent_prompt: "",
};

const brandVoiceOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
  { value: "playful", label: "Playful" },
  { value: "inspirational", label: "Inspirational" },
];

export default function KnowledgeBase() {
  const { subaccountId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<KnowledgeBaseData>(defaultData);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!subaccountId) return;

      try {
        const { data: kb, error } = await supabase
          .from("subaccount_knowledge_base")
          .select("*")
          .eq("subaccount_id", subaccountId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching knowledge base:", error);
          return;
        }

        if (kb) {
          setExistingId(kb.id);
          setData({
            brand_name: kb.brand_name || "",
            tagline: kb.tagline || "",
            brand_voice: kb.brand_voice || "professional",
            industry: kb.industry || "",
            target_audience: kb.target_audience || "",
            key_differentiators: kb.key_differentiators || "",
            system_prompt: kb.system_prompt || "",
            ai_agent_prompt: kb.ai_agent_prompt || "",
          });
        }
      } catch (error) {
        console.error("Error fetching knowledge base:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subaccountId]);

  const handleSave = async () => {
    if (!subaccountId) return;

    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from("subaccount_knowledge_base")
          .update(data)
          .eq("id", existingId);

        if (error) throw error;
      } else {
        const { data: newRecord, error } = await supabase
          .from("subaccount_knowledge_base")
          .insert({ ...data, subaccount_id: subaccountId })
          .select()
          .single();

        if (error) throw error;
        setExistingId(newRecord.id);
      }

      toast.success("Knowledge base saved successfully");
    } catch (error) {
      console.error("Error saving knowledge base:", error);
      toast.error("Failed to save knowledge base");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof KnowledgeBaseData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Define your brand identity and AI writing configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList>
          <TabsTrigger value="brand" className="gap-2">
            <Building className="h-4 w-4" />
            Brand Identity
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            System Prompt
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Agent Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Define your brand's core identity to help the AI understand your voice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand_name">Brand Name</Label>
                  <Input
                    id="brand_name"
                    placeholder="Your company or brand name"
                    value={data.brand_name}
                    onChange={(e) => updateField("brand_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Your brand's tagline or slogan"
                    value={data.tagline}
                    onChange={(e) => updateField("tagline", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand_voice">Brand Voice</Label>
                  <Select
                    value={data.brand_voice}
                    onValueChange={(value) => updateField("brand_voice", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandVoiceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={data.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audience</Label>
                <Textarea
                  id="target_audience"
                  placeholder="Describe your ideal customers or readers. Who are they? What are their pain points?"
                  value={data.target_audience}
                  onChange={(e) => updateField("target_audience", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key_differentiators">Key Differentiators</Label>
                <Textarea
                  id="key_differentiators"
                  placeholder="What makes your brand unique? What sets you apart from competitors?"
                  value={data.key_differentiators}
                  onChange={(e) => updateField("key_differentiators", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>
                This is the foundation prompt that guides all AI content generation. It sets the overall context and rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  placeholder={`Example:
You are a content writer for [Brand Name], a [Industry] company. 

Your writing should:
- Be informative and well-researched
- Use a [Voice] tone
- Focus on providing value to readers
- Include relevant examples and data when possible
- Be optimized for SEO without sacrificing readability`}
                  value={data.system_prompt}
                  onChange={(e) => updateField("system_prompt", e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Prompt</CardTitle>
              <CardDescription>
                Specific instructions for how articles should be written. This prompt is used for article generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="ai_agent_prompt">AI Agent Prompt</Label>
                <Textarea
                  id="ai_agent_prompt"
                  placeholder={`Example:
When writing articles:

## Structure
- Start with a compelling hook
- Use H2 and H3 headings for organization
- Include a clear introduction, body, and conclusion
- Aim for 1500-2500 words unless specified otherwise

## Style
- Write in second person (you/your)
- Use short paragraphs (2-3 sentences max)
- Include bullet points and numbered lists where appropriate
- Add relevant internal/external links

## SEO
- Include the target keyword in the title, first paragraph, and throughout naturally
- Write meta descriptions under 160 characters
- Use related keywords and semantic variations`}
                  value={data.ai_agent_prompt}
                  onChange={(e) => updateField("ai_agent_prompt", e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
