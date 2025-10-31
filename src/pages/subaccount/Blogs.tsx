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
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [subaccountId]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('subaccount_id', subaccountId)
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
          <h1 className="text-3xl font-bold">Blogs</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage blog posts for your WordPress site
          </p>
        </div>
        <Button onClick={() => navigate(`/subaccount/${subaccountId}/blogs/new/edit`)}>
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
              <Button onClick={() => navigate(`/subaccount/${subaccountId}/blogs/new/edit`)}>
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
                      onClick={() => navigate(`/subaccount/${subaccountId}/blogs/${post.id}/edit`)}
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
