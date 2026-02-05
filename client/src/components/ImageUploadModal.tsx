import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, Image, Loader2, Copy, Check } from 'lucide-react';

type UploadedImage = {
  url: string;
  filename: string;
  originalName: string;
  size: number;
};

export function ImageUploadModal({ 
  onImageUploaded 
}: { 
  onImageUploaded: (url: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data: UploadedImage = await response.json();
        setUploadedImages(prev => [...prev, data]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload image');
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseImage = (url: string) => {
    onImageUploaded(url);
    setIsOpen(false);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-testid="button-upload-image">
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
              data-testid="input-file-upload"
            />
            <label 
              htmlFor="image-upload" 
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                  <p className="text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Image className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground">Click to select images or drag and drop</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP up to 10MB</p>
                </>
              )}
            </label>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Uploaded Images</h4>
              <div className="grid grid-cols-2 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="border border-border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      <img 
                        src={image.url} 
                        alt={image.originalName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground truncate" title={image.originalName}>
                        {image.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(image.size)}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => copyToClipboard(image.url)}
                          data-testid={`button-copy-url-${index}`}
                        >
                          {copiedUrl === image.url ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {copiedUrl === image.url ? 'Copied!' : 'Copy URL'}
                        </Button>
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUseImage(image.url)}
                          data-testid={`button-use-image-${index}`}
                        >
                          Use as Featured
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
