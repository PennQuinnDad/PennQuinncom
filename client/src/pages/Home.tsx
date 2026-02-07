import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPosts, formatDate, extractFirstImage, type Post } from '@/lib/posts';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagCombobox } from '@/components/TagCombobox';
import { Calendar, Tag, Search, X, CalendarDays, ChevronLeft, ChevronRight, Play, Shuffle, ImageIcon } from 'lucide-react';

const POSTS_PER_PAGE = 24;

// Helper to extract quote text from post content
function extractQuoteText(content: string): string {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  // Limit length for display
  return text.length > 150 ? text.slice(0, 147) + '...' : text;
}

// Check if post is a "Said by" quote post
function getQuoteType(tags: string[]): 'penn' | 'quinn' | null {
  const lowerTags = tags.map(t => t.toLowerCase());
  if (lowerTags.includes('said by penn')) return 'penn';
  if (lowerTags.includes('said by quinn')) return 'quinn';
  return null;
}

// Check if post contains a video (Vimeo or YouTube)
function isVideoPost(content: string, categories: string[]): boolean {
  const hasVideoCategory = categories.some(c => c.toLowerCase() === 'video');
  const hasVideoEmbed = /vimeo|youtube|youtu\.be/i.test(content);
  return hasVideoCategory || hasVideoEmbed;
}

// Extract video thumbnail URL from content
function getVideoThumbnail(content: string): string | null {
  // YouTube patterns: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const youtubeMatch = content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }

  // Vimeo patterns: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch = content.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    // Vimeo requires an API call for thumbnails, but we can use a proxy service
    // or return null and let it fall back to the play button
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }

  return null;
}

// Calculate age at the time of the post (Penn & Quinn born March 3, 2009)
function getAgeAtPost(postDate: string | Date): number {
  const birthDate = new Date('2009-03-03');
  const post = new Date(postDate);
  let age = post.getFullYear() - birthDate.getFullYear();
  const monthDiff = post.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && post.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const PostCard = memo(function PostCard({ post, onTagClick }: { post: Post; onTagClick: (tag: string) => void }) {
  const hasVideo = isVideoPost(post.content, post.categories);
  const videoThumbnail = hasVideo ? getVideoThumbnail(post.content) : null;
  const featuredImage = post.featuredImage || extractFirstImage(post.content) || videoThumbnail;
  const quoteType = getQuoteType(post.tags);
  const isQuotePost = quoteType !== null;

  // Quote card backgrounds - blue for Penn, green for Quinn
  const quoteStyles = {
    penn: 'bg-gradient-to-br from-blue-500 to-blue-700',
    quinn: 'bg-gradient-to-br from-emerald-500 to-teal-700',
  };

  return (
    <article
      data-testid={`post-card-${post.id}`}
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-card-border"
    >
      <Link href={`/post/${post.slug}`}>
        <div className="cursor-pointer">
          {isQuotePost ? (
            <div className={`aspect-[4/3] ${quoteStyles[quoteType]} flex flex-col items-center justify-center p-6 text-white relative overflow-hidden`}>
              <span className="absolute top-3 left-4 text-6xl opacity-20 font-serif">"</span>
              <p className="text-center text-xl font-medium leading-relaxed z-10 line-clamp-4">
                {extractQuoteText(post.content) || post.title}
              </p>
              <span className="absolute bottom-3 right-4 text-6xl opacity-20 font-serif rotate-180">"</span>
              <span className="absolute bottom-3 left-4 text-sm opacity-70 font-medium">
                — {quoteType === 'penn' ? 'Penn' : 'Quinn'} ({getAgeAtPost(post.date)} yrs old)
              </span>
            </div>
          ) : featuredImage ? (
            <div className="aspect-[4/3] overflow-hidden bg-muted relative">
              <img
                src={featuredImage}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 group-hover:scale-110 transition-all">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          ) : hasVideo ? (
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center relative">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
              <span className="mt-3 text-white/60 text-sm font-medium">Video</span>
            </div>
          ) : (
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-secondary/50 flex flex-col items-center justify-center">
              <ImageIcon className="w-12 h-12 text-primary/20" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground/50 mt-2">No image</span>
            </div>
          )}
          <div className="p-5 pb-2">
            <h2 className="font-display text-xl mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h2>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.date)}
              </span>
            </div>
          </div>
        </div>
      </Link>
      
      {post.tags.length > 0 && (
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map(tag => (
            <button
              key={tag}
              onClick={(e) => {
                e.preventDefault();
                onTagClick(tag);
              }}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary rounded-full text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
              data-testid={`tag-${tag}`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </button>
          ))}
          {post.tags.length > 3 && (
            <span className="text-xs px-2 py-1 text-muted-foreground">
              +{post.tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </article>
  );
});

// Storage key for filters
const FILTER_STORAGE_KEY = 'pennquinn-home-filters';

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Helper to get filters from sessionStorage
function getSavedFilters() {
  try {
    const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { q: '', tags: [], year: null, page: 1 };
}

// Helper to save filters to sessionStorage
function saveFilters(filters: { q: string; tags: string[]; year: string | null; page: number }) {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {}
}

export default function Home() {
  const [, setLocation] = useLocation();

  // Initialize state from sessionStorage
  const initialFilters = getSavedFilters();
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags);
  const [selectedYear, setSelectedYear] = useState<string | null>(initialFilters.year);
  const [currentPage, setCurrentPage] = useState(initialFilters.page);

  // Debounce search query to avoid filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    saveFilters({
      q: searchQuery,
      tags: selectedTags,
      year: selectedYear,
      page: currentPage,
    });
  }, [searchQuery, selectedTags, selectedYear, currentPage]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchAllPosts,
  });

  // Reset to page 1 when search/tags/year filters change
  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    if (hasInteracted) {
      setCurrentPage(1);
    }
    setHasInteracted(true);
  }, [debouncedSearch, selectedTags, selectedYear]);
  
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
    // Sort alphabetically but put numeric-only tags (years) at the end
    return Array.from(tagSet).sort((a, b) => {
      const aIsNumeric = /^\d+$/.test(a);
      const bIsNumeric = /^\d+$/.test(b);
      if (aIsNumeric && !bIsNumeric) return 1;
      if (!aIsNumeric && bIsNumeric) return -1;
      return a.localeCompare(b);
    });
  }, [posts]);
  
  const allYears = useMemo(() => {
    const yearSet = new Set<string>();
    posts.forEach(post => {
      const year = new Date(post.date).getFullYear().toString();
      yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [posts]);
  
  // Pre-compute lowercase search term once
  const filteredPosts = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    const selectedTagsLower = selectedTags.map(t => t.toLowerCase());

    return posts.filter(post => {
      // Quick exit if no filters
      if (!searchLower && selectedTagsLower.length === 0 && !selectedYear) {
        return true;
      }

      // Search in title first (faster), then content only if needed
      const matchesSearch = !searchLower ||
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      const matchesTags = selectedTagsLower.length === 0 ||
        selectedTagsLower.every(selectedTag =>
          post.tags.some(tag => tag.toLowerCase() === selectedTag)
        );

      if (!matchesTags) return false;

      const matchesYear = !selectedYear ||
        new Date(post.date).getFullYear().toString() === selectedYear;

      return matchesYear;
    });
  }, [posts, debouncedSearch, selectedTags, selectedYear]);
  
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);
  
  const handleTagClick = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);
  
  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedYear(null);
  };

  const goToRandomPost = useCallback(() => {
    if (posts.length > 0) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      setLocation(`/post/${randomPost.slug}`);
    }
  }, [posts, setLocation]);
  
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Latest Posts</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={goToRandomPost}
              disabled={posts.length === 0}
              className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Random Memory</span>
              <span className="sm:hidden">Random</span>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8"
                data-testid="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <TagCombobox
              tags={allTags}
              selectedTags={selectedTags}
              onTagSelect={(tag) => setSelectedTags(prev => [...prev, tag])}
            />
            
            <Select
              value={selectedYear || "all"}
              onValueChange={(value) => setSelectedYear(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-36" data-testid="year-dropdown">
                <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {allYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(searchQuery || selectedTags.length > 0 || selectedYear) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                data-testid="clear-filters"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
          
          {(selectedTags.length > 0 || selectedYear) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Filtering by:</span>
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  data-testid={`selected-tag-badge-${tag}`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {tag}
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              ))}
              {selectedYear && (
                <button
                  onClick={() => setSelectedYear(null)}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  data-testid="selected-year-badge"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {selectedYear}
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              )}
            </div>
          )}
          
          <p className="text-muted-foreground mt-4">
            Showing {paginatedPosts.length} of {filteredPosts.length} posts
            {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden shadow-sm border border-card-border animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-5">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded-full w-16" />
                    <div className="h-6 bg-muted rounded-full w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map(post => (
                <PostCard key={post.id} post={post} onTagClick={handleTagClick} />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and pages near current
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, idx, arr) => (
                      <span key={page} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-9"
                          data-testid={`pagination-page-${page}`}
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="pagination-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
        
        {!isLoading && paginatedPosts.length === 0 && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6 opacity-50">🔍</div>
            <h3 className="font-display text-2xl mb-2">No memories found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery
                ? `We couldn't find any posts matching "${searchQuery}"`
                : selectedTags.length > 0
                  ? `No posts with ${selectedTags.length === 1 ? 'this tag' : 'these tags'} yet`
                  : selectedYear
                    ? `No posts from ${selectedYear}`
                    : 'No posts available'}
            </p>
            {(searchQuery || selectedTags.length > 0 || selectedYear) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </main>
      
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PennQuinn.com. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
