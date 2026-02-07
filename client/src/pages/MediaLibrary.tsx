import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Trash2, Copy, Check, Search, Grid, List,
  Image as ImageIcon, Film, LogIn, X, ChevronLeft
} from 'lucide-react';
import { Link } from 'wouter';

type Media = {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  takenAt: string | null;
  alt: string;
};

async function fetchMedia(): Promise<Media[]> {
  const response = await fetch('/api/media');
  if (!response.ok) throw new Error('Failed to fetch media');
  return response.json();
}

async function uploadMedia(files: File[]): Promise<Media[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload media');
  return response.json();
}

async function deleteMedia(id: number): Promise<void> {
  const response = await fetch(`/api/media/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete media');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MediaLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: fetchMedia,
    enabled: isAuthenticated,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (newMedia) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({ title: `Uploaded ${newMedia.length} file(s)` });
    },
    onError: () => {
      toast({ title: 'Failed to upload files', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSelectedMedia(null);
      toast({ title: 'Media deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete media', variant: 'destructive' });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMutation.mutate(Array.from(files));
    }
    e.target.value = '';
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const copyUrl = useCallback((item: Media) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    toast({ title: 'URL copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  }, [toast]);

  const filteredMedia = media.filter(item =>
    item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="font-display text-2xl mb-4">Media Library</h2>
          <p className="text-muted-foreground mb-6">Please log in to access the media library.</p>
          <a href="/api/login">
            <Button>
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

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Admin
              </Button>
            </Link>
            <h2 className="font-display text-2xl">Media Library</h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
              <Button asChild disabled={uploadMutation.isPending}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm text-muted-foreground">
            {filteredMedia.length} item{filteredMedia.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Drop Zone / Media Grid */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-transparent'
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
              <p className="text-lg font-medium text-primary">Drop files to upload</p>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">
              Loading media...
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="py-20 text-center">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-2">
                {searchQuery ? 'No media found' : 'No media uploaded yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click Upload
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                    selectedMedia?.id === item.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  {item.mimeType.startsWith('video/') ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Film className="w-12 h-12 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt || item.originalName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(item);
                      }}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Preview</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Size</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMedia.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedMedia(item)}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedMedia?.id === item.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                          {item.mimeType.startsWith('video/') ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-6 h-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={item.url}
                              alt={item.alt || item.originalName}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-medium truncate max-w-[200px]">{item.originalName}</p>
                        <p className="text-xs text-muted-foreground">{item.mimeType}</p>
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {formatFileSize(item.size)}
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {formatDate(item.uploadedAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyUrl(item);
                          }}
                        >
                          {copiedId === item.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Detail Sidebar */}
      {selectedMedia && (
        <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-xl z-50 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Media Details</h3>
              <button
                onClick={() => setSelectedMedia(null)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
              {selectedMedia.mimeType.startsWith('video/') ? (
                <video
                  src={selectedMedia.url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.alt || selectedMedia.originalName}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Filename</p>
                <p className="font-medium break-all">{selectedMedia.originalName}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-1">URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1 rounded break-all">
                    {selectedMedia.url}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUrl(selectedMedia)}
                  >
                    {copiedId === selectedMedia.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground mb-1">Size</p>
                  <p className="font-medium">{formatFileSize(selectedMedia.size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Type</p>
                  <p className="font-medium">{selectedMedia.mimeType.split('/')[1]}</p>
                </div>
              </div>

              {selectedMedia.width && selectedMedia.height && (
                <div>
                  <p className="text-muted-foreground mb-1">Dimensions</p>
                  <p className="font-medium">{selectedMedia.width} x {selectedMedia.height}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground mb-1">Uploaded</p>
                <p className="font-medium">{formatDate(selectedMedia.uploadedAt)}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm('Delete this media permanently?')) {
                    deleteMutation.mutate(selectedMedia.id);
                  }
                }}
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
