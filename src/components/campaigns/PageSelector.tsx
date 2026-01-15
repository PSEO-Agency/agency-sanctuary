import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CampaignPageDB } from "@/hooks/useCampaignPages";
import { FileText, Loader2 } from "lucide-react";

interface PageSelectorProps {
  pages: CampaignPageDB[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  loading?: boolean;
  label?: string;
  filterStatus?: CampaignPageDB["status"][];
}

export function PageSelector({
  pages,
  selectedPageId,
  onSelectPage,
  loading = false,
  label = "Select Page",
  filterStatus,
}: PageSelectorProps) {
  const filteredPages = filterStatus
    ? pages.filter(p => filterStatus.includes(p.status))
    : pages;

  const selectedPage = pages.find(p => p.id === selectedPageId);

  const getStatusColor = (status: CampaignPageDB["status"]) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "generated":
        return "bg-blue-100 text-blue-700";
      case "reviewed":
        return "bg-amber-100 text-amber-700";
      case "published":
        return "bg-green-100 text-green-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading pages...</span>
        </div>
      </div>
    );
  }

  if (filteredPages.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No pages available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Select value={selectedPageId || ""} onValueChange={onSelectPage}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a page to work with">
            {selectedPage && (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedPage.title}</span>
                <Badge variant="secondary" className={getStatusColor(selectedPage.status)}>
                  {selectedPage.status}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredPages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              <div className="flex items-center gap-2">
                <span className="truncate max-w-[300px]">{page.title}</span>
                <Badge variant="secondary" className={getStatusColor(page.status)}>
                  {page.status}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPage && (
        <p className="text-xs text-muted-foreground">
          Data: {Object.entries(selectedPage.data_values).map(([k, v]) => `${k}: ${v}`).join(" | ")}
        </p>
      )}
    </div>
  );
}
