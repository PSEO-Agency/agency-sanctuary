import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface ProjectKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  subaccountId: string;
}

interface KnowledgeBase {
  id?: string;
  brand_name: string;
  tagline: string;
  brand_voice: string;
  industry: string;
  target_audience: string;
  key_differentiators: string;
  system_prompt: string;
  ai_agent_prompt: string;
}

const defaultKnowledgeBase: KnowledgeBase = {
  brand_name: "",
  tagline: "",
  brand_voice: "",
  industry: "",
  target_audience: "",
  key_differentiators: "",
  system_prompt: "",
  ai_agent_prompt: "",
};

export function ProjectKnowledgeBaseDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  subaccountId,
}: ProjectKnowledgeBaseDialogProps) {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(defaultKnowledgeBase);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchKnowledgeBase();
    }
  }, [open, projectId]);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_knowledge_base")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setKnowledgeBase({
          id: data.id,
          brand_name: data.brand_name || "",
          tagline: data.tagline || "",
          brand_voice: data.brand_voice || "",
          industry: data.industry || "",
          target_audience: data.target_audience || "",
          key_differentiators: data.key_differentiators || "",
          system_prompt: data.system_prompt || "",
          ai_agent_prompt: data.ai_agent_prompt || "",
        });
      } else {
        setKnowledgeBase(defaultKnowledgeBase);
      }
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (knowledgeBase.id) {
        // Update existing
        const { error } = await supabase
          .from("project_knowledge_base")
          .update({
            brand_name: knowledgeBase.brand_name,
            tagline: knowledgeBase.tagline,
            brand_voice: knowledgeBase.brand_voice,
            industry: knowledgeBase.industry,
            target_audience: knowledgeBase.target_audience,
            key_differentiators: knowledgeBase.key_differentiators,
            system_prompt: knowledgeBase.system_prompt,
            ai_agent_prompt: knowledgeBase.ai_agent_prompt,
          })
          .eq("id", knowledgeBase.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("project_knowledge_base")
          .insert({
            project_id: projectId,
            subaccount_id: subaccountId,
            brand_name: knowledgeBase.brand_name,
            tagline: knowledgeBase.tagline,
            brand_voice: knowledgeBase.brand_voice,
            industry: knowledgeBase.industry,
            target_audience: knowledgeBase.target_audience,
            key_differentiators: knowledgeBase.key_differentiators,
            system_prompt: knowledgeBase.system_prompt,
            ai_agent_prompt: knowledgeBase.ai_agent_prompt,
          });

        if (error) throw error;
      }

      toast.success("Knowledge base saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving knowledge base:", error);
      toast.error("Failed to save knowledge base");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof KnowledgeBase, value: string) => {
    setKnowledgeBase((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Knowledge Base - {projectName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="brand" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="brand">Brand Identity</TabsTrigger>
              <TabsTrigger value="system">System Prompt</TabsTrigger>
              <TabsTrigger value="agent">AI Agent</TabsTrigger>
            </TabsList>

            <TabsContent value="brand" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand_name">Brand Name</Label>
                    <Input
                      id="brand_name"
                      value={knowledgeBase.brand_name}
                      onChange={(e) => updateField("brand_name", e.target.value)}
                      placeholder="Your brand name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={knowledgeBase.industry}
                      onChange={(e) => updateField("industry", e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={knowledgeBase.tagline}
                    onChange={(e) => updateField("tagline", e.target.value)}
                    placeholder="Your brand tagline"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand_voice">Brand Voice</Label>
                  <Textarea
                    id="brand_voice"
                    value={knowledgeBase.brand_voice}
                    onChange={(e) => updateField("brand_voice", e.target.value)}
                    placeholder="Describe your brand's tone and voice..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Textarea
                    id="target_audience"
                    value={knowledgeBase.target_audience}
                    onChange={(e) => updateField("target_audience", e.target.value)}
                    placeholder="Describe your target audience..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key_differentiators">Key Differentiators</Label>
                  <Textarea
                    id="key_differentiators"
                    value={knowledgeBase.key_differentiators}
                    onChange={(e) => updateField("key_differentiators", e.target.value)}
                    placeholder="What makes your brand unique..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <p className="text-xs text-muted-foreground">
                  This prompt will be used as context for all AI-generated content in this project.
                </p>
                <Textarea
                  id="system_prompt"
                  value={knowledgeBase.system_prompt}
                  onChange={(e) => updateField("system_prompt", e.target.value)}
                  placeholder="Enter the system prompt that defines how AI should generate content for this project..."
                  rows={12}
                />
              </div>
            </TabsContent>

            <TabsContent value="agent" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ai_agent_prompt">AI Agent Prompt</Label>
                <p className="text-xs text-muted-foreground">
                  Additional instructions for AI agents interacting with this project.
                </p>
                <Textarea
                  id="ai_agent_prompt"
                  value={knowledgeBase.ai_agent_prompt}
                  onChange={(e) => updateField("ai_agent_prompt", e.target.value)}
                  placeholder="Enter specific instructions for AI agents..."
                  rows={12}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
