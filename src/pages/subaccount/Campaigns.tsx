import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { Campaign, CampaignFormData } from "@/components/campaigns/types";
import { toast } from "sonner";

export default function Campaigns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - will be replaced with real data from database
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "1",
      name: "Local SEO Campaign",
      status: "Active",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proin egestas consequat. Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 156,
      totalPages: 200,
      clicks: "8.3k",
      businessType: "local",
      template: "modern-local",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "SaaS Product Pages",
      status: "Draft",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proin egestas consequat. Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 100,
      totalPages: 200,
      clicks: "8.3k",
      businessType: "saas",
      template: "clean-saas",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      name: "E-commerce Categories",
      status: "Active",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proin egestas consequat. Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 156,
      totalPages: 200,
      clicks: "8.3k",
      businessType: "ecommerce",
      template: "ecommerce",
      createdAt: new Date().toISOString(),
    },
  ]);

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampaign = (data: CampaignFormData) => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: data.businessName || "New Campaign",
      status: "Draft",
      description: `${data.businessType} campaign with ${data.selectedTemplate} template.`,
      pagesGenerated: 0,
      totalPages: data.generatedTitles.length || 100,
      clicks: "0",
      businessType: data.businessType,
      template: data.selectedTemplate,
      createdAt: new Date().toISOString(),
    };
    setCampaigns([newCampaign, ...campaigns]);
    toast.success("Campaign created successfully!");
  };

  const handleViewCampaign = (id: string) => {
    // TODO: Navigate to campaign detail page
    toast.info("Campaign detail view coming soon!");
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter((c) => c.id !== id));
    toast.success("Campaign deleted");
  };

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
        {filteredCampaigns.length === 0 ? (
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
              campaign={campaign}
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
    </div>
  );
}
