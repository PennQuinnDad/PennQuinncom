import { useState, useMemo, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPosts, formatDate, extractFirstImage, type Post } from '@/lib/posts';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagCombobox } from '@/components/TagCombobox';
import { Calendar, Tag, Search, X, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const POSTS_PER_PAGE = 24;

function PostCard({ post, onTagClick }: { post: Post; onTagClick: (tag: string) => void }) {
  const featuredImage = post.featuredImage || extractFirstImage(post.content);
  
  return (
    <article 
      data-testid={`post-card-${post.id}`}
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-card-border"
    >
      <Link href={`/post/${post.slug}`}>
        <div className="cursor-pointer">
          {featuredImage && (
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img 
                src={featuredImage} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          )}
          {!featuredImage && (
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-6xl opacity-30">📷</span>
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
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchAllPosts,
  });
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, selectedYear]);
  
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [posts]);
  
  const allYears = useMemo(() => {
    const yearSet = new Set<string>();
    posts.forEach(post => {
      const year = new Date(post.date).getFullYear().toString();
      yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [posts]);
  
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(selectedTag => 
          post.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
        );
      
      const matchesYear = !selectedYear || 
        new Date(post.date).getFullYear().toString() === selectedYear;
      
      return matchesSearch && matchesTags && matchesYear;
    });
  }, [posts, searchQuery, selectedTags, selectedYear]);
  
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);
  
  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedYear(null);
  };
  
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="font-display text-2xl mb-4">Latest Posts</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
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
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Loading posts...</p>
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
            <p className="text-muted-foreground text-lg">No posts found.</p>
            {(searchQuery || selectedTags.length > 0 || selectedYear) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-primary hover:underline"
              >
                Clear filters
              </button>
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
