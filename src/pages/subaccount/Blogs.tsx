import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, FileText, Loader2, Edit, ExternalLink } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  created_at: string;
  published_at?: string;
  wordpress_url?: string;
  wordpress_post_id?: string;
}

export default function Blogs() {
  const { subaccountId, projectId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    fetchProjectAndPosts();
  }, [subaccountId, projectId]);

  const fetchProjectAndPosts = async () => {
    setLoading(true);
    
    // Fetch project name
    if (projectId) {
      const { data: projectData } = await supabase
        .from('blog_projects')
        .select('name')
        .eq('id', projectId)
        .maybeSingle();
      
      if (projectData) {
        setProjectName(projectData.name);
      }
    }

    // Fetch posts for this project
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button 
              onClick={() => navigate(`/subaccount/${subaccountId}/projects`)}
              className="hover:text-foreground transition-colors"
            >
              Projects
            </button>
            <span>/</span>
            <span>{projectName || 'Loading...'}</span>
          </div>
          <h1 className="text-3xl font-bold">Blogs</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage blog posts for this project
          </p>
        </div>
        <Button onClick={() => navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs/new/edit`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Blog Post
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No blog posts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first blog post to get started
              </p>
              <Button onClick={() => navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs/new/edit`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Blog Post
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {post.excerpt}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {post.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs/${post.id}/edit`)}
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    {post.wordpress_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(post.wordpress_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(post.created_at).toLocaleDateString()}
                  {post.published_at && ` • Published: ${new Date(post.published_at).toLocaleDateString()}`}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
