import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings2, Search, Link, Image, CheckCircle } from "lucide-react";

export interface ArticleConfig {
  approveEditSeoData: boolean;
  approveOutline: boolean;
  approveContent: boolean;
  seoNlpResearch: boolean;
  useTop10Serp: boolean;
  topicResearch: boolean;
  imageSelection: 'manual' | 'dynamic' | 'media_library' | 'api' | 'ai';
  addExternalLinks: boolean;
  externalLinksCount: number;
  addInternalLinks: boolean;
  internalLinksCount: number;
}

interface ArticleConfigPanelProps {
  config: ArticleConfig;
  setConfig: (config: ArticleConfig) => void;
}

export function ArticleConfigPanel({ config, setConfig }: ArticleConfigPanelProps) {
  const updateConfig = (key: keyof ArticleConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Approval Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle className="h-4 w-4 text-primary" />
          Approval Settings
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="approve-seo" className="text-sm text-muted-foreground cursor-pointer">
              Approve/Edit SEO Data
            </Label>
            <Switch
              id="approve-seo"
              checked={config.approveEditSeoData}
              onCheckedChange={(checked) => updateConfig('approveEditSeoData', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="approve-outline" className="text-sm text-muted-foreground cursor-pointer">
              Approve Outline
            </Label>
            <Switch
              id="approve-outline"
              checked={config.approveOutline}
              onCheckedChange={(checked) => updateConfig('approveOutline', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="approve-content" className="text-sm text-muted-foreground cursor-pointer">
              Approve Content
            </Label>
            <Switch
              id="approve-content"
              checked={config.approveContent}
              onCheckedChange={(checked) => updateConfig('approveContent', checked)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Research Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Search className="h-4 w-4 text-primary" />
          Research Settings
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="seo-nlp" className="text-sm text-muted-foreground cursor-pointer">
              SEO/NLP Research
            </Label>
            <Switch
              id="seo-nlp"
              checked={config.seoNlpResearch}
              onCheckedChange={(checked) => updateConfig('seoNlpResearch', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="top10-serp" className="text-sm text-muted-foreground cursor-pointer">
              Use Top 10 SERP
            </Label>
            <Switch
              id="top10-serp"
              checked={config.useTop10Serp}
              onCheckedChange={(checked) => updateConfig('useTop10Serp', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="topic-research" className="text-sm text-muted-foreground cursor-pointer">
              Topic Research
            </Label>
            <Switch
              id="topic-research"
              checked={config.topicResearch}
              onCheckedChange={(checked) => updateConfig('topicResearch', checked)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Image Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Image className="h-4 w-4 text-primary" />
          Image Selection
        </div>
        
        <div className="pl-6">
          <Select
            value={config.imageSelection}
            onValueChange={(value) => updateConfig('imageSelection', value as ArticleConfig['imageSelection'])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select image source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="dynamic">Dynamic</SelectItem>
              <SelectItem value="media_library">Media Library</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="ai">AI Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Link Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link className="h-4 w-4 text-primary" />
          Link Settings
        </div>
        
        <div className="space-y-4 pl-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="external-links" className="text-sm text-muted-foreground cursor-pointer">
                Add External Links/Citations
              </Label>
              <Switch
                id="external-links"
                checked={config.addExternalLinks}
                onCheckedChange={(checked) => updateConfig('addExternalLinks', checked)}
              />
            </div>
            {config.addExternalLinks && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.externalLinksCount}
                  onChange={(e) => updateConfig('externalLinksCount', parseInt(e.target.value) || 1)}
                  className="h-8 w-20"
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="internal-links" className="text-sm text-muted-foreground cursor-pointer">
                Add Internal Links
              </Label>
              <Switch
                id="internal-links"
                checked={config.addInternalLinks}
                onCheckedChange={(checked) => updateConfig('addInternalLinks', checked)}
              />
            </div>
            {config.addInternalLinks && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Number of links:</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.internalLinksCount}
                  onChange={(e) => updateConfig('internalLinksCount', parseInt(e.target.value) || 1)}
                  className="h-8 w-20"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
