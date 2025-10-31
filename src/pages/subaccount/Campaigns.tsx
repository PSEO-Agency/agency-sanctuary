import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Filter } from "lucide-react";

export default function Campaigns() {
  const campaigns = [
    {
      id: "1",
      name: "Campaign Name",
      status: "Active",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proih egestas consequat.Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 156,
      totalPages: 200,
      clicks: "8.3k",
    },
    {
      id: "2",
      name: "Campaign Name",
      status: "Draft",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proih egestas consequat.Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 100,
      totalPages: 200,
      clicks: "8.3k",
    },
    {
      id: "3",
      name: "Campaign Name",
      status: "Active",
      description: "Lorem ipsum dolor sit amet consectetur. Sem magna vitae eget mi non proih egestas consequat.Lorem ipsum dolor sit amet consectetur.",
      pagesGenerated: 156,
      totalPages: 200,
      clicks: "8.3k",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{campaign.name}</CardTitle>
                      <Badge
                        variant={campaign.status === "Active" ? "default" : "secondary"}
                        className={campaign.status === "Active" ? "bg-success hover:bg-success" : ""}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {campaign.description}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-8 text-sm">
                  <div>
                    <span className="font-semibold">Pages Generated:</span>{" "}
                    <span className="text-primary">{campaign.pagesGenerated}</span>
                    <span className="text-muted-foreground">/{campaign.totalPages}</span>
                  </div>
                  <div>
                    <span className="text-primary">{campaign.clicks}</span> clicks
                  </div>
                </div>
                <Button>View</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
