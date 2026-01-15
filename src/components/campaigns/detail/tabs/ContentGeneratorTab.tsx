import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Sparkles, Pencil, Trash2, Type, AlignLeft, Image, Menu, Loader2 } from "lucide-react";
import { CampaignDB } from "@/hooks/useCampaigns";
import { CampaignPageDB, SectionContent } from "@/hooks/useCampaignPages";
import { PageSelector } from "../../PageSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ContentGeneratorTabProps {
  campaign: CampaignDB;
  pages: CampaignPageDB[];
  pagesLoading: boolean;
  onUpdateSEO: (id: string, metaTitle: string, metaDescription: string) => Promise<boolean>;
  onUpdateContent: (id: string, sections: SectionContent[]) => Promise<boolean>;
}

export function ContentGeneratorTab({ campaign, pages, pagesLoading, onUpdateSEO, onUpdateContent }: ContentGeneratorTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>("hero");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [contentTypes, setContentTypes] = useState({
    headline: true,
    subheadline: false,
    callToAction: true,
  });
  const [toneOfVoice, setToneOfVoice] = useState("formal");

  const selectedPage = pages.find(p => p.id === selectedPageId);

  const sections: Section[] = [
    { id: "hero", name: "Hero Section", description: "Main banner with call-to-action", icon: <Type className="h-4 w-4" /> },
    { id: "content", name: "Content Block", description: "Text content with formatting", icon: <AlignLeft className="h-4 w-4" /> },
    { id: "gallery", name: "Image Gallery", description: "Responsive image grid", icon: <Image className="h-4 w-4" /> },
    { id: "footer", name: "Footer", description: "Links and contact information", icon: <Menu className="h-4 w-4" /> },
  ];

  // Load page data when selected
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setMetaTitle(page.meta_title || "");
      setMetaDescription(page.meta_description || "");
    }
  };

  const handleGenerateSEO = async () => {
    if (!selectedPage) {
      toast.error("Please select a page first");
      return;
    }

    setIsGenerating(true);
    try {
      // Generate SEO content based on page data
      const dataValues = selectedPage.data_values;
      const title = selectedPage.title;
      
      // Simple template-based generation (can be replaced with AI later)
      const generatedTitle = `${title} | Professional Services`;
      const generatedDesc = `Discover the best ${Object.values(dataValues).join(" ")} services. Quality guaranteed.`;
      
      setMetaTitle(generatedTitle.substring(0, 60));
      setMetaDescription(generatedDesc.substring(0, 160));
      
      toast.success("SEO content generated!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSEO = async () => {
    if (!selectedPageId) return;
    
    const success = await onUpdateSEO(selectedPageId, metaTitle, metaDescription);
    if (success) {
      toast.success("SEO settings saved!");
    }
  };

  const handleGenerateSectionContent = async () => {
    if (!selectedPage || !selectedSection) {
      toast.error("Please select a page and section first");
      return;
    }

    setIsGenerating(true);
    try {
      const dataValues = selectedPage.data_values;
      const sectionName = sections.find(s => s.id === selectedSection)?.name || "";
      
      // Simple template-based generation
      let content = "";
      if (contentTypes.headline) {
        content += `# Welcome to ${Object.values(dataValues).join(" ")}\n\n`;
      }
      if (contentTypes.subheadline) {
        content += `## Your trusted partner for quality services\n\n`;
      }
      if (contentTypes.callToAction) {
        content += `[Get Started Today](/contact)`;
      }
      
      setGeneratedContent(content);
      toast.success(`${sectionName} content generated!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedPageId || !selectedSection) return;
    
    const existingSections = selectedPage?.sections_content || [];
    const updatedSections: SectionContent[] = [
      ...existingSections.filter(s => s.id !== selectedSection),
      {
        id: selectedSection,
        name: sections.find(s => s.id === selectedSection)?.name || "",
        type: selectedSection,
        fields: {
          body: { original: generatedContent, rendered: generatedContent, isPrompt: false }
        },
        generated: true,
      }
    ];
    
    const success = await onUpdateContent(selectedPageId, updatedSections);
    if (success) {
      toast.success("Section content saved!");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Content Generator</h2>
        <p className="text-sm text-muted-foreground">Generate SEO-optimized content for your pages</p>
      </div>

      {/* Page Selector */}
      <PageSelector
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={handleSelectPage}
        loading={pagesLoading}
        label="Select Page to Generate Content"
      />

      {!selectedPageId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Select a page above to start generating content</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Page & SEO Settings */}
          <div className="space-y-6">
            {/* SEO Settings Generator */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">SEO Settings Generator</h3>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Meta Title (60 chars max)</Label>
                  <Input 
                    placeholder="Enter meta title..."
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    maxLength={60}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60</p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Meta Description (160 chars max)</Label>
                  <Textarea 
                    placeholder="Enter meta description..."
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    maxLength={160}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleSaveSEO}>
                    Save
                  </Button>
                  <Button className="flex-1" onClick={handleGenerateSEO} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hero Section Content */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Section Content Settings</h3>
                <p className="text-sm text-muted-foreground">Select what content type you want to generate</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Headline</Label>
                    <Switch 
                      checked={contentTypes.headline}
                      onCheckedChange={(checked) => setContentTypes(prev => ({ ...prev, headline: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Subheadline</Label>
                    <Switch 
                      checked={contentTypes.subheadline}
                      onCheckedChange={(checked) => setContentTypes(prev => ({ ...prev, subheadline: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Call-to-action</Label>
                    <Switch 
                      checked={contentTypes.callToAction}
                      onCheckedChange={(checked) => setContentTypes(prev => ({ ...prev, callToAction: checked }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Tone of voice</Label>
                  <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Section Content Generator */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">Section Content Generator</h3>
                <p className="text-sm text-muted-foreground mb-4">Select a section to start generating content</p>

                <Label className="text-sm">Page Sections</Label>
                <div className="mt-2 space-y-2">
                  {sections.map((section) => (
                    <div 
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                        selectedSection === section.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded",
                          selectedSection === section.id ? "bg-primary text-white" : "bg-muted"
                        )}>
                          {section.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{section.name}</p>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generated Content Area */}
                <div className="mt-4">
                  <Textarea 
                    placeholder="Generated content will appear here"
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="resize-none min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={handleSaveContent}>
                    Save
                  </Button>
                  <Button className="flex-1" onClick={handleGenerateSectionContent} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
