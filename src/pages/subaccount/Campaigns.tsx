import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { CampaignDetailDialog } from "@/components/campaigns/detail/CampaignDetailDialog";
import { CampaignFormData } from "@/components/campaigns/types";
import { useCampaigns, CampaignDB } from "@/hooks/useCampaigns";

export default function Campaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDB | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns();

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampaign = async (data: CampaignFormData) => {
    await createCampaign(data);
  };

  const handleViewCampaign = (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      setSelectedCampaign(campaign);
      setIsDetailDialogOpen(true);
    }
  };

  const handleSaveCampaign = async (campaign: CampaignDB) => {
    await updateCampaign(campaign.id, campaign);
    setIsDetailDialogOpen(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaign(id);
  };

  // Convert CampaignDB to the format expected by CampaignCard
  const toCampaignCardFormat = (c: CampaignDB) => ({
    id: c.id,
    name: c.name,
    status: (c.status === "active" ? "Active" : c.status === "paused" ? "Paused" : "Draft") as "Active" | "Draft" | "Paused",
    description: c.description || "",
    pagesGenerated: c.pages_generated,
    totalPages: c.total_pages,
    clicks: c.clicks > 1000 ? `${(c.clicks / 1000).toFixed(1)}k` : c.clicks.toString(),
    businessType: c.business_type || "",
    template: c.template_id || "",
    createdAt: c.created_at,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No campaigns found</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first campaign
            </Button>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={toCampaignCardFormat(campaign)}
              onView={handleViewCampaign}
              onDelete={handleDeleteCampaign}
            />
          ))
        )}
      </div>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onComplete={handleCreateCampaign}
      />

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        campaign={selectedCampaign}
        onSave={handleSaveCampaign}
      />
    </div>
  );
}
