import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Search, Filter, LayoutList, LayoutGrid } from "lucide-react";
import { ArticlesTable } from "@/components/articles/ArticlesTable";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetupProgress } from "@/components/SetupProgress";

interface BlogProject {
  id: string;
  name: string;
  airtable_record_id: string | null;
  language: string | null;
  language_engine: string | null;
  project_type: string | null;
  created_at: string;
}

interface Subaccount {
  id: string;
  name: string;
  airtable_base_id: string | null;
}

// Language options from Airtable schema
const LANGUAGES = [
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'English', label: 'English' },
  { value: 'Finnish', label: 'Finnish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Swedish', label: 'Swedish' },
];

// Language engine options - will be fetched dynamically from Airtable
interface FieldOption {
  value: string;
  label: string;
}

export default function BlogProjects() {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<BlogProject[]>([]);
  const [activeProject, setActiveProject] = useState<BlogProject | null>(null);
  const [subaccount, setSubaccount] = useState<Subaccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState("English");
  const [newProjectLanguageEngine, setNewProjectLanguageEngine] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"simple" | "full">("simple");
  const [refreshKey, setRefreshKey] = useState(0);
  const [languageEngineOptions, setLanguageEngineOptions] = useState<FieldOption[]>([]);
  const [loadingFieldOptions, setLoadingFieldOptions] = useState(false);
  
  const STORAGE_KEY = `selected_project_${subaccountId}`;

  useEffect(() => {
    fetchSubaccountAndProjects();
  }, [subaccountId]);

  // Fetch field options from Airtable when dialog opens
  useEffect(() => {
    if (dialogOpen && subaccount?.airtable_base_id && languageEngineOptions.length === 0) {
      fetchFieldOptions();
    }
  }, [dialogOpen, subaccount?.airtable_base_id]);

  const fetchFieldOptions = async () => {
    if (!subaccount?.airtable_base_id) return;
    
    setLoadingFieldOptions(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-airtable-field-options', {
        body: { 
          baseId: subaccount.airtable_base_id,
          tableName: 'Projects'
        }
      });

      if (error || !data?.success) {
        console.error('Failed to fetch field options:', error || data?.error);
        return;
      }

      // Find the Language Engine field (might be named differently)
      const fieldOptions = data.fieldOptions;
      const engineField = Object.keys(fieldOptions).find(
        key => key.toLowerCase().includes('language') && key.toLowerCase().includes('engine')
      ) || Object.keys(fieldOptions).find(key => key.toLowerCase().includes('engine'));

      if (engineField && fieldOptions[engineField]?.choices) {
        const options = fieldOptions[engineField].choices.map((c: { name: string }) => ({
          value: c.name,
          label: c.name
        }));
        setLanguageEngineOptions(options);
        // Set default if not already set
        if (!newProjectLanguageEngine && options.length > 0) {
          setNewProjectLanguageEngine(options[0].value);
        }
      }
    } catch (err) {
      console.error('Error fetching field options:', err);
    }
    setLoadingFieldOptions(false);
  };

  const fetchSubaccountAndProjects = async () => {
    setLoading(true);
    
    // Fetch subaccount to get the airtable_base_id
    const { data: subaccountData, error: subaccountError } = await supabase
      .from('subaccounts')
      .select('id, name, airtable_base_id')
      .eq('id', subaccountId)
      .single();
    
    if (subaccountError) {
      console.error('Error fetching subaccount:', subaccountError);
      toast.error('Failed to load subaccount');
      setLoading(false);
      return;
    }
    
    setSubaccount(subaccountData);
    
    // Fetch projects
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
    
    // Try to restore previously selected project from localStorage
    const savedProjectId = localStorage.getItem(STORAGE_KEY);
    const savedProject = data?.find(p => p.id === savedProjectId);
    
    if (savedProject) {
      setActiveProject(savedProject);
    } else if (data && data.length > 0) {
      // Fallback to first project
      setActiveProject(data[0]);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    if (!subaccount?.airtable_base_id) {
      toast.error('Project setup is pending. Please contact support.');
      return;
    }

    setCreating(true);
    try {
      // Create project record in Airtable
      const { data: airtableData, error: airtableError } = await supabase.functions.invoke('create-project-record', {
        body: { 
          baseId: subaccount.airtable_base_id,
          name: newProjectName.trim(),
          language: newProjectLanguage,
          languageEngine: newProjectLanguageEngine,
        }
      });

      if (airtableError || !airtableData?.success) {
        throw new Error(airtableData?.error || airtableError?.message || 'Failed to create project in Airtable');
      }

      // Save project to database
      const { data, error } = await supabase
        .from('blog_projects')
        .insert({
          subaccount_id: subaccountId,
          name: newProjectName.trim(),
          airtable_record_id: airtableData.recordId,
          language: newProjectLanguage,
          language_engine: newProjectLanguageEngine,
          project_type: 'Content',
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
        setNewProjectLanguage("English");
        setNewProjectLanguageEngine("English (United States)");
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

  // Check if subaccount has an Airtable base configured
  const hasAirtableBase = !!subaccount?.airtable_base_id;

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
                if (project) {
                  setActiveProject(project);
                  localStorage.setItem(STORAGE_KEY, project.id);
                }
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
          {activeProject && hasAirtableBase && (
            <CreateArticleDialog 
              baseId={subaccount!.airtable_base_id!} 
              projectId={activeProject.id}
              projectRecordId={activeProject.airtable_record_id}
              onArticleCreated={handleArticleCreated}
            />
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!hasAirtableBase}>
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={newProjectLanguage} onValueChange={setNewProjectLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="languageEngine">Language Engine</Label>
                  <Select 
                    value={newProjectLanguageEngine} 
                    onValueChange={setNewProjectLanguageEngine}
                    disabled={loadingFieldOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFieldOptions ? "Loading..." : "Select language engine"} />
                    </SelectTrigger>
                    <SelectContent>
                      {languageEngineOptions.map((engine) => (
                        <SelectItem key={engine.value} value={engine.value}>
                          {engine.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The project will be created in your Airtable base.
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

      {/* Setup Progress */}
      {!hasAirtableBase && subaccount && (
        <SetupProgress 
          subaccountId={subaccountId!}
          subaccountName={subaccount.name}
          onSetupComplete={fetchSubaccountAndProjects}
        />
      )}

      {/* Filter Bar */}
      {hasAirtableBase && (
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
      )}

      {/* Articles Table */}
      {hasAirtableBase && (
        !activeProject ? (
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
            baseId={subaccount!.airtable_base_id!} 
            isOpen={true}
            projectId={activeProject.id}
            projectRecordId={activeProject.airtable_record_id}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            viewMode={viewMode}
          />
        )
      )}
    </div>
  );
}
