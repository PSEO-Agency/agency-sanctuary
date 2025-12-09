import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Hash, AlignLeft, CheckCircle2, AlertCircle } from "lucide-react";
import type { Article } from "../ArticleRow";

interface ArticleSEOPanelProps {
  article: Article;
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
}

export function ArticleSEOPanel({
  article,
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  slug,
  setSlug,
}: ArticleSEOPanelProps) {
  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;
  
  const titleStatus = titleLength === 0 ? 'empty' : titleLength <= 60 ? 'good' : 'warning';
  const descStatus = descLength === 0 ? 'empty' : descLength <= 160 ? 'good' : 'warning';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Preview Card */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Search Preview
          </h4>
          <div className="bg-background border rounded-lg p-3 space-y-1">
            <p className="text-blue-600 text-sm font-medium truncate hover:underline cursor-pointer">
              {metaTitle || article.name || 'Page Title'}
            </p>
            <p className="text-green-700 text-xs font-mono truncate">
              example.com/{slug || 'page-url'}
            </p>
            <p className="text-muted-foreground text-xs line-clamp-2">
              {metaDescription || 'Add a meta description to see how your page will appear in search results.'}
            </p>
          </div>
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            URL Slug
          </Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="page-url-slug"
            className="font-mono text-sm"
          />
        </div>

        {/* Meta Title */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Meta Title
          </Label>
          <Input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Enter meta title..."
            className="text-sm"
          />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              {titleStatus === 'good' && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Good length</span>
                </>
              )}
              {titleStatus === 'warning' && (
                <>
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  <span className="text-yellow-600">Too long</span>
                </>
              )}
            </div>
            <span className={titleLength > 60 ? 'text-yellow-600' : 'text-muted-foreground'}>
              {titleLength}/60
            </span>
          </div>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <AlignLeft className="h-3 w-3" />
            Meta Description
          </Label>
          <Textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Enter meta description..."
            className="text-sm min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              {descStatus === 'good' && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Good length</span>
                </>
              )}
              {descStatus === 'warning' && (
                <>
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  <span className="text-yellow-600">Too long</span>
                </>
              )}
            </div>
            <span className={descLength > 160 ? 'text-yellow-600' : 'text-muted-foreground'}>
              {descLength}/160
            </span>
          </div>
        </div>

        {/* SEO Score Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wide">SEO Checklist</h5>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              {metaTitle ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={metaTitle ? 'text-foreground' : 'text-muted-foreground'}>
                Meta title added
              </span>
            </li>
            <li className="flex items-center gap-2">
              {metaDescription ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={metaDescription ? 'text-foreground' : 'text-muted-foreground'}>
                Meta description added
              </span>
            </li>
            <li className="flex items-center gap-2">
              {slug ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={slug ? 'text-foreground' : 'text-muted-foreground'}>
                URL slug defined
              </span>
            </li>
            <li className="flex items-center gap-2">
              {titleLength <= 60 && titleLength > 0 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={titleLength <= 60 && titleLength > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                Title under 60 chars
              </span>
            </li>
            <li className="flex items-center gap-2">
              {descLength <= 160 && descLength > 0 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={descLength <= 160 && descLength > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                Description under 160 chars
              </span>
            </li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
