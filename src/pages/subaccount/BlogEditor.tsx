import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Loader2, Upload, X } from "lucide-react";

export default function BlogEditor() {
  const { subaccountId, projectId, blogId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  
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

  // Auto-save every 30 seconds
  useEffect(() => {
    if (blogId && blogId !== 'new' && (title || content)) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [title, content, excerpt, featuredImage, categories, tags]);

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
      navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs`);
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
      
      const { error: uploadError } = await supabase.storage
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

  const handleAutoSave = async () => {
    if (!title || !content || blogId === 'new') return;

    setAutoSaving(true);
    try {
      const postData = {
        title,
        content,
        excerpt: excerpt || content.substring(0, 150),
        featured_image: featuredImage,
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', blogId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
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
        project_id: projectId,
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
        navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs/${data.id}/edit`);
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
            project_id: projectId,
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
      navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs`);
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || "Failed to publish to WordPress");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/subaccount/${subaccountId}/projects/${projectId}/blogs`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Button>
          
          <div className="flex items-center gap-2">
            {autoSaving && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
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
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto py-8 px-4">
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Input
              id="title"
              placeholder="Blog post title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-4xl font-bold border-0 focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Featured Image */}
          <div className="space-y-2">
            {featuredImage ? (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="w-full h-96 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-4 right-4"
                  onClick={() => setFeaturedImage("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer text-primary hover:underline text-base"
                  >
                    {uploading ? "Uploading..." : "Add featured image"}
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your blog post content..."
            />
          </div>

          {/* Metadata Section */}
          <div className="border-t pt-8 space-y-6">
            <h3 className="text-lg font-semibold">SEO & Metadata</h3>
            
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
          </div>
        </div>
      </main>
    </div>
  );
}
