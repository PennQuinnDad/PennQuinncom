import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Search, Image as ImageIcon, Film, Check, X, Grid, List
} from 'lucide-react';

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

type MediaPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  mediaType?: 'image' | 'video' | 'all';
};

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  mediaType = 'all',
}: MediaPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: fetchMedia,
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (newMedia) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({ title: `Uploaded ${newMedia.length} file(s)` });
      // Auto-select newly uploaded files
      if (multiple) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          newMedia.forEach(m => next.add(m.id));
          return next;
        });
      } else if (newMedia.length > 0) {
        setSelectedIds(new Set([newMedia[0].id]));
      }
    },
    onError: () => {
      toast({ title: 'Failed to upload files', variant: 'destructive' });
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

  const toggleSelection = (item: Media) => {
    if (multiple) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([item.id]));
    }
  };

  const handleInsert = () => {
    const urls = media
      .filter(m => selectedIds.has(m.id))
      .map(m => m.url);
    onSelect(urls);
    setSelectedIds(new Set());
    onClose();
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch =
      item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      mediaType === 'all' ||
      (mediaType === 'image' && item.mimeType.startsWith('image/')) ||
      (mediaType === 'video' && item.mimeType.startsWith('video/'));

    return matchesSearch && matchesType;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Media Library</h2>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept={mediaType === 'video' ? 'video/*' : mediaType === 'image' ? 'image/*' : 'image/*,video/*'}
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
              <Button variant="outline" size="sm" asChild disabled={uploadMutation.isPending}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div
          className={`flex-1 overflow-y-auto p-4 ${isDragging ? 'bg-primary/5' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-lg font-medium text-primary">Drop files to upload</p>
            </div>
          )}

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading media...</div>
          ) : filteredMedia.length === 0 ? (
            <div className="py-10 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No media found' : 'No media uploaded yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop files here, or click Upload
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleSelection(item)}
                  className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedIds.has(item.id)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  {item.mimeType.startsWith('video/') ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Film className="w-10 h-10 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt || item.originalName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {selectedIds.has(item.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected`
              : 'Select media to insert'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={selectedIds.size === 0}>
              Insert {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
