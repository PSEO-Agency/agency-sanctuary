import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, FileText, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  created_at: string;
  published_at?: string;
}

export default function Pages() {
  const { subaccountId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");

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

  const checkWordPressConnection = async () => {
    const { data: subaccount } = await supabase
      .from('subaccounts')
      .select('integration_settings')
      .eq('id', subaccountId)
      .maybeSingle();
    
    const settings = subaccount?.integration_settings as any;
    const wpConfig = settings?.wordpress;
    
    if (!wpConfig?.url || !wpConfig?.username || !wpConfig?.app_password) {
      toast.error("WordPress not configured. Please set up WordPress integration in Settings.");
      navigate(`/subaccount/${subaccountId}/settings/integrations`);
      return false;
    }
    
    return true;
  };

  const handleSaveDraft = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    const { error } = await supabase
      .from('blog_posts')
      .insert({
        subaccount_id: subaccountId,
        title,
        content,
        excerpt: excerpt || content.substring(0, 150),
        featured_image: featuredImage,
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'draft',
      });

    if (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } else {
      toast.success("Draft saved successfully");
      setCreateOpen(false);
      resetForm();
      fetchPosts();
    }
  };

  const handlePublishToWordPress = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    const isConnected = await checkWordPressConnection();
    if (!isConnected) return;

    setPublishing(true);

    try {
      // First save to database
      const { data: savedPost, error: saveError } = await supabase
        .from('blog_posts')
        .insert({
          subaccount_id: subaccountId,
          title,
          content,
          excerpt: excerpt || content.substring(0, 150),
          featured_image: featuredImage,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status: 'publishing',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Publish to WordPress via edge function
      const { data: result, error: publishError } = await supabase.functions.invoke('publish-to-wordpress', {
        body: {
          subaccountId,
          postId: savedPost.id,
          title,
          content,
          excerpt: excerpt || content.substring(0, 150),
          featuredImage,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }
      });

      if (publishError) throw publishError;

      // Update post status
      await supabase
        .from('blog_posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
          wordpress_post_id: result.postId,
          wordpress_url: result.url,
        })
        .eq('id', savedPost.id);

      toast.success("Published to WordPress successfully!");
      setCreateOpen(false);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || "Failed to publish to WordPress");
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setFeaturedImage("");
    setCategories("");
    setTags("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pages</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage blog posts for your WordPress site
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Blog Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Blog Post</DialogTitle>
              <DialogDescription>
                Write your blog post with SEO-optimized schema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Brief summary of your post (meta description)"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your blog post content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image URL</Label>
                <Input
                  id="featuredImage"
                  placeholder="https://example.com/image.jpg"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categories">Categories</Label>
                  <Input
                    id="categories"
                    placeholder="Technology, Business (comma-separated)"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="AI, automation (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  onClick={handlePublishToWordPress}
                  disabled={publishing}
                  className="flex-1"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish to WordPress
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
              <Button onClick={() => setCreateOpen(true)}>
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
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 rounded text-xs ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {post.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
