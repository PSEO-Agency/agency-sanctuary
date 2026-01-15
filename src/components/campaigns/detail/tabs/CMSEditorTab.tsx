import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Pencil, Trash2, Type, AlignLeft, Image, Menu, Plus, Eye, X, GripVertical } from "lucide-react";
import { Campaign } from "../../types";
import { cn } from "@/lib/utils";

interface PageSection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface CMSEditorTabProps {
  campaign: Campaign;
}

export function CMSEditorTab({ campaign }: CMSEditorTabProps) {
  const [pageTitle, setPageTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["SEO", "Content", "Marketing"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [customContent, setCustomContent] = useState("");

  const [sections, setSections] = useState<PageSection[]>([
    { id: "hero", name: "Hero Section", description: "Main banner with call-to-action", icon: <Type className="h-4 w-4" /> },
    { id: "content", name: "Content Block", description: "Text content with formatting", icon: <AlignLeft className="h-4 w-4" /> },
    { id: "gallery", name: "Image Gallery", description: "Responsive image grid", icon: <Image className="h-4 w-4" /> },
    { id: "footer", name: "Footer", description: "Links and contact information", icon: <Menu className="h-4 w-4" /> },
  ]);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleRemoveSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">CMS Editor</h2>
          <p className="text-sm text-muted-foreground">Edit your page content and structure</p>
        </div>
        <Button>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate with AI
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Page Settings */}
        <div className="space-y-6">
          {/* Page Title */}
          <div>
            <Label className="text-sm">Page Title</Label>
            <Input 
              placeholder="Enter page title..."
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* SEO Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">SEO Settings</h3>
              
              <div>
                <Label className="text-sm text-muted-foreground">Meta Title (60 chars max)</Label>
                <Input 
                  placeholder="Enter meta title..."
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={60}
                  className="mt-1"
                />
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
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Keywords</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge 
                      key={keyword} 
                      variant="secondary" 
                      className="gap-1 pr-1"
                    >
                      {keyword}
                      <button 
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input 
                    placeholder="Enter keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Content Settings</h3>
              
              <div className="flex items-center justify-between">
                <Label>Auto-generate content</Label>
                <Switch 
                  checked={autoGenerate}
                  onCheckedChange={setAutoGenerate}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Custom Content</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <Textarea 
                  placeholder="Enter custom content..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="mt-1 resize-none"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Page Structure Preview */}
        <div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Page Structure Preview</h3>
                <Button variant="link" size="sm" className="text-primary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              </div>

              {/* SEO Preview */}
              <div className="p-4 bg-muted/30 rounded-lg mb-4">
                <p className="text-xs text-muted-foreground mb-1">SEO Preview</p>
                <p className="text-primary font-medium">
                  {pageTitle || "Your Page Title Here"}
                </p>
                <p className="text-xs text-green-600">www.yoursite.com/page-url</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metaDescription || "Your meta description will appear here and help users understand what this page is about..."}
                </p>
              </div>

              {/* Sections */}
              <div>
                <Label className="text-sm mb-2 block">Page Sections</Label>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <div 
                      key={section.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-muted-foreground/30 cursor-move group"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-2 rounded bg-primary/10">
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click and drag the section to change the order
                </p>
              </div>

              <Button variant="link" className="text-primary mt-4 p-0">
                <Eye className="h-4 w-4 mr-1" />
                Preview Full Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
