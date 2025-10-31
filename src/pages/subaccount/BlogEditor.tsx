import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Loader2, Upload, X } from "lucide-react";

export default function BlogEditor() {
  const { subaccountId, blogId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (blogId && blogId !== 'new') {
      fetchBlogPost();
    }
  }, [blogId]);

  const fetchBlogPost = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', blogId)
      .single();
    
    if (error) {
      console.error('Error fetching blog post:', error);
      toast.error("Failed to load blog post");
      navigate(`/subaccount/${subaccountId}/blogs`);
    } else {
      setTitle(data.title);
      setContent(data.content);
      setExcerpt(data.excerpt || "");
      setFeaturedImage(data.featured_image || "");
      setCategories(data.categories?.join(', ') || "");
      setTags(data.tags?.join(', ') || "");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${subaccountId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setFeaturedImage(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    setLoading(true);
    try {
      const postData = {
        subaccount_id: subaccountId,
        title,
        content,
        excerpt: excerpt || content.substring(0, 150),
        featured_image: featuredImage,
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'draft',
      };

      if (blogId && blogId !== 'new') {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', blogId);

        if (error) throw error;
        toast.success("Draft updated successfully");
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert(postData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Draft saved successfully");
        navigate(`/subaccount/${subaccountId}/blogs/${data.id}`);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Failed to save draft");
    } finally {
      setLoading(false);
    }
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
      return false;
    }
    
    return true;
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
      let currentBlogId = blogId;

      // First save/update as draft
      if (!blogId || blogId === 'new') {
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
        currentBlogId = savedPost.id;
      } else {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ status: 'publishing' })
          .eq('id', blogId);

        if (updateError) throw updateError;
      }

      // Publish to WordPress via edge function
      const { data: result, error: publishError } = await supabase.functions.invoke('publish-to-wordpress', {
        body: {
          subaccountId,
          postId: currentBlogId,
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
        .eq('id', currentBlogId);

      toast.success("Published to WordPress successfully!");
      navigate(`/subaccount/${subaccountId}/blogs`);
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || "Failed to publish to WordPress");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/subaccount/${subaccountId}/blogs`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blogs
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handlePublishToWordPress}
            disabled={publishing}
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

      <Card>
        <CardHeader>
          <CardTitle>
            {blogId && blogId !== 'new' ? 'Edit Blog Post' : 'Create Blog Post'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt (Meta Description)</Label>
            <Textarea
              id="excerpt"
              placeholder="Brief summary of your post (160 characters max for SEO)"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {excerpt.length}/160 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Featured Image</Label>
            {featuredImage ? (
              <div className="relative">
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setFeaturedImage("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    {uploading ? "Uploading..." : "Click to upload image"}
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your blog post content here... (HTML supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              You can use HTML tags for formatting
            </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
