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
import { Sparkles, Pencil, Trash2, Type, AlignLeft, Image, Menu } from "lucide-react";
import { Campaign } from "../../types";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ContentGeneratorTabProps {
  campaign: Campaign;
}

export function ContentGeneratorTab({ campaign }: ContentGeneratorTabProps) {
  const [selectedPage, setSelectedPage] = useState("teeth-health");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>("hero");
  const [generatedContent, setGeneratedContent] = useState("");
  
  const [contentTypes, setContentTypes] = useState({
    headline: true,
    subheadline: false,
    callToAction: true,
  });
  const [toneOfVoice, setToneOfVoice] = useState("formal");

  const pageTitles = [
    { id: "teeth-health", title: "Teeth Health in New York" },
    { id: "dental-implants", title: "Dental Implants in Amsterdam" },
    { id: "orthodontics", title: "Orthodontics in Rotterdam" },
  ];

  const sections: Section[] = [
    { id: "hero", name: "Hero Section", description: "Main banner with call-to-action", icon: <Type className="h-4 w-4" /> },
    { id: "content", name: "Content Block", description: "Text content with formatting", icon: <AlignLeft className="h-4 w-4" /> },
    { id: "gallery", name: "Image Gallery", description: "Responsive image grid", icon: <Image className="h-4 w-4" /> },
    { id: "footer", name: "Footer", description: "Links and contact information", icon: <Menu className="h-4 w-4" /> },
  ];

  const handleGenerate = () => {
    // Simulate content generation
    setGeneratedContent("Generated content will appear here after processing...");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Content Generator</h2>
        <p className="text-sm text-muted-foreground">Generate SEO-optimized content for your pages</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Page & SEO Settings */}
        <div className="space-y-6">
          {/* Select Page */}
          <div>
            <Label className="text-sm">Select Page Title</Label>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageTitles.map(page => (
                  <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <Button variant="outline" className="flex-1">Cancel</Button>
                <Button className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hero Section Content */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Hero Section Content</h3>
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
                <Button variant="outline" className="flex-1">Cancel</Button>
                <Button className="flex-1" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
