import * as fs from 'fs';
import * as xml2js from 'xml2js';

interface WPPost {
  id: number;
  title: string;
  slug: string;
  date: string;
  content: string;
  excerpt: string;
  status: string;
  type: string;
  categories: string[];
  tags: string[];
  featuredImage?: string;
}

async function parseWordPressXML(xmlPath: string, filterYear?: string): Promise<WPPost[]> {
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlContent);
  
  const channel = result.rss.channel;
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  
  const posts: WPPost[] = [];
  
  for (const item of items) {
    const postType = item['wp:post_type'];
    const status = item['wp:status'];
    
    // Only process published posts
    if (postType !== 'post' || status !== 'publish') continue;
    
    const postDate = item['wp:post_date'] || '';
    const postYear = postDate.substring(0, 4);
    
    // Filter by year if specified
    if (filterYear && postYear !== filterYear) continue;
    
    // Extract categories
    const categories: string[] = [];
    const tags: string[] = [];
    
    if (item.category) {
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      for (const cat of cats) {
        if (typeof cat === 'object' && cat.$) {
          if (cat.$.domain === 'category') {
            categories.push(cat._ || cat);
          } else if (cat.$.domain === 'post_tag') {
            tags.push(cat._ || cat);
          }
        } else if (typeof cat === 'string') {
          categories.push(cat);
        }
      }
    }
    
    // Extract content - handle CDATA
    let content = item['content:encoded'] || '';
    if (typeof content === 'object') content = '';
    
    // Clean up WordPress shortcodes and convert to simpler HTML
    content = cleanContent(content);
    
    // Extract featured image from content or meta
    let featuredImage: string | undefined;
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      featuredImage = imgMatch[1];
    }
    
    // Check postmeta for featured image
    if (item['wp:postmeta']) {
      const metas = Array.isArray(item['wp:postmeta']) ? item['wp:postmeta'] : [item['wp:postmeta']];
      for (const meta of metas) {
        if (meta['wp:meta_key'] === '_thumbnail_id') {
          // Would need to resolve this from attachments
        }
      }
    }
    
    posts.push({
      id: parseInt(item['wp:post_id'] || '0', 10),
      title: item.title || 'Untitled',
      slug: item['wp:post_name'] || `post-${item['wp:post_id']}`,
      date: postDate,
      content,
      excerpt: item['excerpt:encoded'] || '',
      status,
      type: postType,
      categories,
      tags,
      featuredImage
    });
  }
  
  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return posts;
}

function cleanContent(content: string): string {
  // Remove WordPress shortcodes
  content = content.replace(/\[(?:vc_|nectar_|slidepress)[^\]]*\]/g, '');
  content = content.replace(/\[\/(?:vc_|nectar_)[^\]]*\]/g, '');
  
  // Convert old WordPress image URLs to local paths
  content = content.replace(
    /https?:\/\/(?:www\.)?pennquinn\.com\/wp-content\/uploads\//g,
    '/uploads/'
  );
  content = content.replace(
    /http:\/\/live-pennquinn\.pantheonsite\.io\/wp-content\/uploads\//g,
    '/uploads/'
  );
  
  // Clean up empty paragraphs
  content = content.replace(/<p>\s*<\/p>/g, '');
  content = content.replace(/\n\n+/g, '\n\n');
  
  return content.trim();
}

async function main() {
  const xmlPath = 'attached_assets/pennquinncom.WordPress.2025-10-06_1769958592108.xml';
  const filterYears = ['2017', '2018'];
  
  console.log(`Parsing WordPress XML for years ${filterYears.join(', ')}...`);
  
  let posts: WPPost[] = [];
  for (const year of filterYears) {
    const yearPosts = await parseWordPressXML(xmlPath, year);
    posts = posts.concat(yearPosts);
    console.log(`Found ${yearPosts.length} published posts from ${year}`);
  }
  
  // Sort all posts by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log(`Total: ${posts.length} posts`);
  
  // Save to JSON for the frontend
  const outputPath = 'client/src/data/posts.json';
  fs.mkdirSync('client/src/data', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
  
  console.log(`Saved posts to ${outputPath}`);
  
  // Also parse all years to get category list
  const allPosts = await parseWordPressXML(xmlPath);
  console.log(`Total published posts across all years: ${allPosts.length}`);
  
  // Extract unique categories
  const allCategories = new Set<string>();
  const allTags = new Set<string>();
  for (const post of allPosts) {
    post.categories.forEach(c => allCategories.add(c));
    post.tags.forEach(t => allTags.add(t));
  }
  
  console.log(`Categories: ${Array.from(allCategories).join(', ')}`);
  console.log(`Tags: ${Array.from(allTags).slice(0, 20).join(', ')}...`);
}

main().catch(console.error);
