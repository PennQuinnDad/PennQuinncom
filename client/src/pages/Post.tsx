import { Link, useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { fetchPostBySlug, fetchAllPosts, formatDate, type Post } from '@/lib/posts';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { Calendar, Tag, ArrowLeft, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

function processVideoEmbeds(content: string): string {
  let processed = content;
  
  // Process Vimeo URLs: https://vimeo.com/123456789
  processed = processed.replace(
    /(?:https?:)?\/\/(?:www\.)?vimeo\.com\/(\d+)(?:\?[^\s<"]*)?/g,
    (match, videoId) => {
      return `<div class="aspect-video my-4"><iframe src="https://player.vimeo.com/video/${videoId}?dnt=1" class="w-full h-full rounded-lg" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );
  
  // Process existing Vimeo iframe embeds - make them responsive
  processed = processed.replace(
    /<iframe([^>]*?)src=["'](?:https?:)?\/\/player\.vimeo\.com\/video\/(\d+)([^"']*)["']([^>]*)>[\s\S]*?<\/iframe>/gi,
    (match, before, videoId) => {
      return `<div class="aspect-video my-4"><iframe src="https://player.vimeo.com/video/${videoId}?dnt=1" class="w-full h-full rounded-lg" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );
  
  // Process YouTube URLs: https://youtu.be/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID
  processed = processed.replace(
    /(?:https?:)?\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)(?:\?[^\s<"]*)?/g,
    (match, videoId) => {
      return `<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full h-full rounded-lg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );
  
  processed = processed.replace(
    /(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:&[^\s<"]*)?/g,
    (match, videoId) => {
      return `<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full h-full rounded-lg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );
  
  // Process old YouTube embed code (object/embed tags) - convert to responsive iframe
  processed = processed.replace(
    /<object[^>]*>[\s\S]*?youtube\.com\/v\/([a-zA-Z0-9_-]+)[\s\S]*?<\/object>/gi,
    (match, videoId) => {
      return `<div class="aspect-video my-4"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full h-full rounded-lg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );

  // Process local mp4 video files - convert paths to video players
  processed = processed.replace(
    /(?:^|\s)(\/uploads\/[^\s<"]+\.mp4)(?:\s|$|<)/gi,
    (match, videoPath) => {
      return `<div class="aspect-video my-4"><video src="${videoPath}" class="w-full h-full rounded-lg" controls playsinline preload="metadata"></video></div>`;
    }
  );

  return processed;
}

function PostContent({ content }: { content: string }) {
  const processedContent = processVideoEmbeds(content);

  // Sanitize HTML to prevent XSS attacks while allowing safe tags
  const sanitizedContent = DOMPurify.sanitize(processedContent, {
    ADD_TAGS: ['iframe', 'video'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src', 'class', 'controls', 'playsinline', 'preload'],
  });

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

function RelatedPost({ post, direction }: { post: Post; direction: 'prev' | 'next' }) {
  return (
    <Link href={`/post/${post.slug}`}>
      <div 
        className={`group flex items-center gap-3 p-4 rounded-lg bg-card border border-card-border hover:border-primary/30 transition-colors cursor-pointer ${
          direction === 'next' ? 'text-right flex-row-reverse' : ''
        }`}
      >
        <div className={`flex-shrink-0 ${direction === 'next' ? 'ml-2' : 'mr-2'}`}>
          {direction === 'prev' ? (
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            {direction === 'prev' ? 'Previous' : 'Next'}
          </p>
          <p className="font-medium truncate group-hover:text-primary transition-colors">
            {post.title}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function PostPage() {
  const params = useParams();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
  });
  
  const { data: allPosts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchAllPosts,
  });
  
  if (postLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The post you're looking for doesn't exist.</p>
          <Link href="/">
            <Button data-testid="back-home-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const currentIndex = allPosts.findIndex(p => p.slug === post.slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-10">
        <article data-testid={`post-${post.id}`}>
          <header className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-4xl md:text-5xl mb-4 leading-tight">
                {post.title}
              </h1>
              {isAuthenticated && (
                <Link href={`/admin?edit=${post.id}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    data-testid="edit-post-button"
                    className="flex-shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-200"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(post.date)}
              </span>
              
              {post.categories.length > 0 && (
                <span className="text-sm">
                  in {post.categories.join(', ')}
                </span>
              )}
            </div>
            
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      // Save tag filter to sessionStorage so Home page picks it up
                      sessionStorage.setItem('pennquinn-home-filters', JSON.stringify({
                        q: '',
                        tags: [tag],
                        year: null,
                        page: 1,
                      }));
                      window.location.href = '/';
                    }}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-secondary rounded-full text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </header>
          
          <div className="border-t border-border pt-8">
            {post.content ? (
              <PostContent content={post.content} />
            ) : (
              <p className="text-muted-foreground italic">
                This post has no content available.
              </p>
            )}
          </div>
          
          {post.galleryImages && post.galleryImages.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="font-display text-xl mb-4">Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {post.galleryImages.map((url, index) => (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-muted hover:opacity-90 transition-opacity"
                    data-testid={`gallery-image-${index}`}
                  >
                    <img 
                      src={url} 
                      alt={`Gallery image ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
        
        <nav className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prevPost ? (
              <RelatedPost post={prevPost} direction="prev" />
            ) : (
              <div />
            )}
            {nextPost && (
              <RelatedPost post={nextPost} direction="next" />
            )}
          </div>
        </nav>
      </main>
      
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PennQuinn.com. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
