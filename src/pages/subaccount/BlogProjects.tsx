import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Search, Filter, LayoutList, LayoutGrid, ChevronDown } from "lucide-react";
import { ArticlesTable } from "@/components/articles/ArticlesTable";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogProject {
  id: string;
  name: string;
  airtable_base_id: string;
  created_at: string;
}

export default function BlogProjects() {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<BlogProject[]>([]);
  const [activeProject, setActiveProject] = useState<BlogProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"simple" | "full">("simple");
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    fetchProjects();
  }, [subaccountId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_projects')
      .select('*')
      .eq('subaccount_id', subaccountId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
      setLoading(false);
      return;
    }

    setProjects(data || []);
    // Auto-select first project
    if (data && data.length > 0) {
      setActiveProject(data[0]);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setCreating(true);
    try {
      const { data: pseoData, error: pseoError } = await supabase.functions.invoke('create-pseo-project', {
        body: { name: newProjectName.trim() }
      });

      if (pseoError || !pseoData?.success) {
        throw new Error(pseoData?.error || pseoError?.message || 'Failed to create PSEO project');
      }

      const { data, error } = await supabase
        .from('blog_projects')
        .insert({
          subaccount_id: subaccountId,
          name: newProjectName.trim(),
          airtable_base_id: pseoData.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving project:', error);
        toast.error('Failed to save project');
      } else {
        toast.success('Project created successfully');
        setProjects([data, ...projects]);
        setActiveProject(data);
        setDialogOpen(false);
        setNewProjectName("");
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
    }
    setCreating(false);
  };

  const handleArticleCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Articles</h1>
          {projects.length > 0 && (
            <Select 
              value={activeProject?.id || ""} 
              onValueChange={(value) => {
                const project = projects.find(p => p.id === value);
                if (project) setActiveProject(project);
              }}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeProject && (
            <CreateArticleDialog 
              baseId={activeProject.airtable_base_id} 
              projectId={activeProject.id}
              onArticleCreated={handleArticleCreated}
            />
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="My Blog Project"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    An Airtable base will be automatically created for this project.
                  </p>
                </div>
                <Button onClick={handleCreateProject} disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 py-2 border-b">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="h-8 bg-transparent p-0 gap-4">
            <TabsTrigger value="all" className="px-0 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="generated" className="px-0 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm">
              Generated
            </TabsTrigger>
            <TabsTrigger value="draft" className="px-0 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm">
              Drafted
            </TabsTrigger>
            <TabsTrigger value="processing" className="px-0 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm">
              Processing
            </TabsTrigger>
            <TabsTrigger value="published" className="px-0 h-8 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-sm">
              Published
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-[200px] text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === "simple" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2 rounded-r-none"
              onClick={() => setViewMode("simple")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "full" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2 rounded-l-none"
              onClick={() => setViewMode("full")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Articles Table */}
      {!activeProject ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <ArticlesTable 
          key={refreshKey}
          baseId={activeProject.airtable_base_id} 
          isOpen={true}
          projectId={activeProject.id}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}