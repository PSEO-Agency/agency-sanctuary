import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, FolderOpen, Loader2, CheckCircle, XCircle, Database, ChevronDown, ChevronRight } from "lucide-react";
import { ArticlesTable } from "@/components/articles/ArticlesTable";

interface BlogProject {
  id: string;
  name: string;
  airtable_base_id: string;
  created_at: string;
}

interface AirtableTable {
  id: string;
  name: string;
  description?: string;
}

export default function BlogProjects() {
  const { subaccountId } = useParams();
  const [projects, setProjects] = useState<BlogProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newAirtableBaseId, setNewAirtableBaseId] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; tables?: AirtableTable[]; error?: string }>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
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
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newAirtableBaseId.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from('blog_projects')
      .insert({
        subaccount_id: subaccountId,
        name: newProjectName.trim(),
        airtable_base_id: newAirtableBaseId.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } else {
      toast.success('Project created successfully');
      setProjects([data, ...projects]);
      setDialogOpen(false);
      setNewProjectName("");
      setNewAirtableBaseId("");
    }
    setCreating(false);
  };

  const testAirtableConnection = async (projectId: string, baseId: string) => {
    setTestingConnection(projectId);
    try {
      const { data, error } = await supabase.functions.invoke('test-airtable-connection', {
        body: { baseId }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionResults(prev => ({
          ...prev,
          [projectId]: { success: true, tables: data.tables }
        }));
        toast.success(`Connected! Found ${data.tables.length} tables`);
      } else {
        setConnectionResults(prev => ({
          ...prev,
          [projectId]: { success: false, error: data.error }
        }));
        toast.error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      setConnectionResults(prev => ({
        ...prev,
        [projectId]: { success: false, error: error.message }
      }));
      toast.error('Failed to test connection');
    }
    setTestingConnection(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your blog projects with Airtable integration
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                <Label htmlFor="airtableBaseId">Airtable Base ID</Label>
                <Input
                  id="airtableBaseId"
                  placeholder="appXXXXXXXXXXXXXX"
                  value={newAirtableBaseId}
                  onChange={(e) => setNewAirtableBaseId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your Airtable base URL: airtable.com/appXXXXXXXX
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

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first blog project with Airtable integration
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Collapsible
              key={project.id}
              open={expandedProjects[project.id]}
              onOpenChange={(open) => setExpandedProjects(prev => ({ ...prev, [project.id]: open }))}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Airtable Base: <code className="bg-muted px-1 py-0.5 rounded text-xs">{project.airtable_base_id}</code>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testAirtableConnection(project.id, project.airtable_base_id)}
                        disabled={testingConnection === project.id}
                      >
                        {testingConnection === project.id ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : connectionResults[project.id]?.success ? (
                          <CheckCircle className="mr-2 h-3 w-3 text-green-500" />
                        ) : connectionResults[project.id]?.error ? (
                          <XCircle className="mr-2 h-3 w-3 text-red-500" />
                        ) : (
                          <Database className="mr-2 h-3 w-3" />
                        )}
                        Test Connection
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="default">
                          {expandedProjects[project.id] ? (
                            <ChevronDown className="mr-2 h-3 w-3" />
                          ) : (
                            <ChevronRight className="mr-2 h-3 w-3" />
                          )}
                          View Articles
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  {connectionResults[project.id]?.tables && (
                    <div className="mt-4 p-3 bg-muted rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setConnectionResults(prev => {
                          const newResults = { ...prev };
                          delete newResults[project.id];
                          return newResults;
                        })}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <p className="text-sm font-medium mb-2">Tables found:</p>
                      <div className="flex flex-wrap gap-2">
                        {connectionResults[project.id].tables!.map((table) => (
                          <span key={table.id} className="px-2 py-1 bg-background rounded text-xs">
                            {table.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {connectionResults[project.id]?.error && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-destructive">{connectionResults[project.id].error}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <ArticlesTable 
                      baseId={project.airtable_base_id} 
                      isOpen={expandedProjects[project.id] || false}
                      projectId={project.id}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
