import { useState, useEffect, useMemo } from 'react';
import { Link, useSearch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllPosts, createPost, updatePost, deletePost, formatDate, type Post } from '@/lib/posts';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClearableInput } from '@/components/ClearableInput';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, X, Save, LogIn, Upload, Image, Video, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ImageUploadModal } from '@/components/ImageUploadModal';
import { DateInput } from '@/components/DateInput';

type PostFormData = {
  title: string;
  slug: string;
  content: string;
  categories: string;
  tags: string;
  featuredImage: string;
  galleryImages: string[];
  date: Date;
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/manage\/videos\/(\d+)/,
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function QuickVideoPost({ onCreated }: { onCreated: () => void }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [uploadDate, setUploadDate] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchMetadata = async (url: string) => {
    const videoId = extractVimeoId(url);
    if (!videoId) return;
    
    setIsFetching(true);
    try {
      const response = await fetch(`/api/vimeo/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.title && !title) {
          setTitle(data.title);
        }
        if (data.uploadDate) {
          setUploadDate(data.uploadDate);
        }
        if (data.thumbnail) {
          setThumbnail(data.thumbnail);
        }
        toast({ title: 'Video info loaded!' });
      }
    } catch (e) {
      // Silently fail - user can still enter title manually
    } finally {
      setIsFetching(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setUploadDate(null);
    setThumbnail(null);
    const videoId = extractVimeoId(url);
    if (videoId) {
      fetchMetadata(url);
    }
  };

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setVideoUrl('');
      setTitle('');
      setUploadDate(null);
      setThumbnail(null);
      setIsCreating(false);
      toast({ title: 'Video post created!' });
      onCreated();
    },
    onError: () => {
      toast({ title: 'Failed to create video post', variant: 'destructive' });
      setIsCreating(false);
    },
  });

  const handleCreate = () => {
    const videoId = extractVimeoId(videoUrl);
    if (!videoId) {
      toast({ title: 'Invalid Vimeo URL', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    const slug = generateSlug(title);
    const embedCode = `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    
    // Use upload date if available, otherwise use current date
    const postDate = uploadDate ? new Date(uploadDate).toISOString() : new Date().toISOString();

    createMutation.mutate({
      title: title.trim(),
      slug,
      date: postDate,
      content: embedCode,
      excerpt: '',
      status: 'publish',
      type: 'post',
      categories: ['Video'],
      tags: [],
      featuredImage: thumbnail || '',
      galleryImages: [],
    });
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 mb-6">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Video className="w-4 h-4" />
        Quick Video Post
      </h3>
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-muted-foreground block mb-1">Vimeo URL</label>
          <Input
            data-testid="input-video-url"
            value={videoUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://vimeo.com/manage/videos/4687455"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-muted-foreground block mb-1">Post Title {isFetching && '(loading...)'}</label>
          <Input
            data-testid="input-video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Video Title"
          />
        </div>
        <Button
          data-testid="button-create-video-post"
          onClick={handleCreate}
          disabled={isCreating || isFetching || !videoUrl || !title}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create Post'}
        </Button>
      </div>
      {(uploadDate || thumbnail) && (
        <div className="flex items-center gap-4 mt-3">
          {thumbnail && (
            <img src={thumbnail} alt="Video thumbnail" className="w-24 h-auto rounded border border-border" />
          )}
          <div className="text-sm text-muted-foreground">
            {uploadDate && <p>Upload date: {new Date(uploadDate).toLocaleDateString()}</p>}
            {thumbnail && <p className="text-green-600">Thumbnail will be used as featured image</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function PostForm({ 
  post, 
  onSave, 
  onCancel,
  onDelete,
  isSaving 
}: { 
  post?: Post; 
  onSave: (data: PostFormData) => void; 
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<PostFormData>({
    title: post?.title || '',
    slug: post?.slug || '',
    content: post?.content || '',
    categories: post?.categories?.join(', ') || '',
    tags: post?.tags?.join(', ') || '',
    featuredImage: post?.featuredImage || '',
    galleryImages: post?.galleryImages || [],
    date: post?.date ? new Date(post.date) : new Date(),
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: post ? prev.slug : generateSlug(title),
    }));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-display text-xl mb-4">
        {post ? 'Edit Post' : 'New Post'}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <ClearableInput
            data-testid="input-title"
            value={formData.title}
            onChange={handleTitleChange}
            onClear={() => setFormData(prev => ({ ...prev, title: '', slug: post ? prev.slug : '' }))}
            placeholder="Enter post title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <ClearableInput
            data-testid="input-slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            onClear={() => setFormData(prev => ({ ...prev, slug: '' }))}
            placeholder="post-url-slug"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Post Date</label>
          <DateInput
            value={formData.date}
            onChange={(date) => setFormData(prev => ({ ...prev, date }))}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Content (HTML)</label>
          <Textarea
            data-testid="input-content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="<p>Your content here...</p>"
            rows={8}
          />
          <div className="mt-2 flex gap-2 items-center">
            <Input
              data-testid="input-embed-video"
              placeholder="Paste Vimeo URL to embed..."
              className="flex-1 max-w-md text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.currentTarget;
                  const url = input.value;
                  const videoId = extractVimeoId(url);
                  if (videoId) {
                    const embedCode = `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
                    setFormData(prev => ({
                      ...prev,
                      content: prev.content ? `${prev.content}\n\n${embedCode}` : embedCode
                    }));
                    input.value = '';
                  }
                }
              }}
            />
            <span className="text-xs text-muted-foreground">Press Enter to embed</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Featured Image URL</label>
          <div className="flex gap-2">
            <ClearableInput
              data-testid="input-featured-image"
              value={formData.featuredImage}
              onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
              onClear={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
              placeholder="/uploads/2024/01/image.jpg"
              className="flex-1"
            />
            <ImageUploadModal 
              onImageUploaded={(url) => setFormData(prev => ({ ...prev, featuredImage: url }))}
            />
          </div>
          {formData.featuredImage && (
            <div className="mt-2 relative inline-block group">
              <img 
                src={formData.featuredImage} 
                alt="Featured preview" 
                className="max-h-32 rounded border border-border"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="button-remove-featured-image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Gallery Images</label>
          <p className="text-xs text-muted-foreground mb-2">Add additional images to display in a grid</p>
          
          <div className="grid grid-cols-4 gap-2 mb-2">
            {formData.galleryImages.map((url, index) => (
              <div key={index} className="relative aspect-square bg-muted rounded overflow-hidden group">
                <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    galleryImages: prev.galleryImages.filter((_, i) => i !== index)
                  }))}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-remove-gallery-${index}`}
                >
                  <X className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    featuredImage: url
                  }))}
                  className="absolute bottom-1 left-1 right-1 bg-primary text-primary-foreground text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-set-featured-${index}`}
                >
                  Set as Featured
                </button>
              </div>
            ))}
            
            <label className="aspect-square border-2 border-dashed border-border rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  
                  for (const file of Array.from(files)) {
                    const formDataUpload = new FormData();
                    formDataUpload.append('image', file);
                    
                    try {
                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formDataUpload,
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setFormData(prev => ({
                          ...prev,
                          galleryImages: [...prev.galleryImages, data.url]
                        }));
                      }
                    } catch (err) {
                      console.error('Upload failed:', err);
                    }
                  }
                  e.target.value = '';
                }}
                data-testid="input-gallery-upload"
              />
              <Image className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Add</span>
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categories (comma-separated)</label>
            <ClearableInput
              data-testid="input-categories"
              value={formData.categories}
              onChange={(e) => setFormData(prev => ({ ...prev, categories: e.target.value }))}
              onClear={() => setFormData(prev => ({ ...prev, categories: '' }))}
              placeholder="2024, Family"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <ClearableInput
              data-testid="input-tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              onClear={() => setFormData(prev => ({ ...prev, tags: '' }))}
              placeholder="Penn, Quinn, Vacation"
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button 
            data-testid="button-save"
            onClick={() => onSave(formData)}
            disabled={isSaving || !formData.title || !formData.slug}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            data-testid="button-cancel"
            variant="outline" 
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {onDelete && (
            <Button 
              data-testid="button-delete-form"
              variant="destructive" 
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'title' | 'date' | 'categories'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const searchString = useSearch();
  
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchAllPosts,
  });
  
  const handleSort = (column: 'title' | 'date' | 'categories') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const filteredPosts = useMemo(() => {
    let result = posts;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.categories.some(c => c.toLowerCase().includes(query)) ||
        post.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortColumn === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortColumn === 'categories') {
        comparison = (a.categories[0] || '').localeCompare(b.categories[0] || '');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [posts, searchQuery, sortColumn, sortDirection]);
  
  useEffect(() => {
    if (searchString && posts.length > 0) {
      const params = new URLSearchParams(searchString);
      const editId = params.get('edit');
      if (editId) {
        const postToEdit = posts.find(p => p.id === parseInt(editId, 10));
        if (postToEdit) {
          setEditingPost(postToEdit);
        }
      }
    }
  }, [searchString, posts]);
  
  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setIsCreating(false);
      toast({ title: 'Post created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create post', variant: 'destructive' });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Post> }) => updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setEditingPost(null);
      toast({ title: 'Post updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update post', variant: 'destructive' });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setEditingPost(null);
      toast({ title: 'Post deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    },
  });
  
  const handleCreate = (formData: PostFormData) => {
    createMutation.mutate({
      title: formData.title,
      slug: formData.slug,
      date: formData.date.toISOString(),
      content: formData.content,
      excerpt: '',
      status: 'publish',
      type: 'post',
      categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      featuredImage: formData.featuredImage || null,
      galleryImages: formData.galleryImages,
    });
  };
  
  const handleUpdate = (formData: PostFormData) => {
    if (!editingPost) return;
    updateMutation.mutate({
      id: editingPost.id,
      data: {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        date: formData.date.toISOString(),
        categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        featuredImage: formData.featuredImage || null,
        galleryImages: formData.galleryImages,
      },
    });
  };
  
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
  
  const handleDelete = (post: Post) => {
    setDeleteConfirmPost(post);
  };
  
  const confirmDelete = () => {
    if (deleteConfirmPost) {
      deleteMutation.mutate(deleteConfirmPost.id);
      setDeleteConfirmPost(null);
    }
  };
  
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Header showAdminLink={false} />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header showAdminLink={false} />
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="font-display text-2xl mb-4">Admin Area</h2>
          <p className="text-muted-foreground mb-6">Please log in to manage posts.</p>
          <a href="/api/login">
            <Button data-testid="login-button">
              <LogIn className="w-4 h-4 mr-2" />
              Log in
            </Button>
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Header showAdminLink={false} />
      
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="font-display text-2xl">Manage Posts</h2>
          <p className="text-muted-foreground text-sm">Welcome back, {user?.firstName || user?.email || 'Admin'}</p>
        </div>
        {!isCreating && !editingPost && (
          <>
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <Button 
                data-testid="button-new-post"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="admin-search-input"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && (
                <span className="text-sm text-muted-foreground">
                  {filteredPosts.length} of {posts.length} posts
                </span>
              )}
            </div>
            <QuickVideoPost onCreated={() => {}} />
          </>
        )}
        
        {isCreating && (
          <div className="mb-8">
            <PostForm
              onSave={handleCreate}
              onCancel={() => setIsCreating(false)}
              isSaving={createMutation.isPending}
            />
          </div>
        )}
        
        {editingPost && (
          <div className="mb-8">
            <PostForm
              post={editingPost}
              onSave={handleUpdate}
              onCancel={() => setEditingPost(null)}
              onDelete={() => handleDelete(editingPost)}
              isSaving={updateMutation.isPending}
            />
          </div>
        )}
        
        {isLoading ? (
          <p className="text-muted-foreground">Loading posts...</p>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('title')}
                    data-testid="sort-title"
                  >
                    <span className="flex items-center gap-1">
                      Title
                      {sortColumn === 'title' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </span>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('date')}
                    data-testid="sort-date"
                  >
                    <span className="flex items-center gap-1">
                      Date
                      {sortColumn === 'date' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </span>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('categories')}
                    data-testid="sort-categories"
                  >
                    <span className="flex items-center gap-1">
                      Categories
                      {sortColumn === 'categories' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPosts.map(post => (
                  <tr key={post.id} data-testid={`post-row-${post.id}`}>
                    <td className="px-4 py-3">
                      <Link href={`/post/${post.slug}`}>
                        <span className="hover:text-primary cursor-pointer">{post.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(post.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {post.categories.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        data-testid={`button-edit-${post.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPost(post)}
                        disabled={!!editingPost || isCreating}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`button-delete-${post.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredPosts.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                {searchQuery ? `No posts found for "${searchQuery}"` : 'No posts yet. Create your first post!'}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmPost(null)}>
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Post?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete "<span className="font-medium text-foreground">{deleteConfirmPost.title}</span>"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                data-testid="button-cancel-delete"
                variant="outline"
                onClick={() => setDeleteConfirmPost(null)}
              >
                Cancel
              </Button>
              <Button
                data-testid="button-confirm-delete"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
