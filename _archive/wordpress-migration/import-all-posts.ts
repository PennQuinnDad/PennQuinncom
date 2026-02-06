import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { db } from '../server/db';
import { posts } from '../shared/schema';

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

async function parseWordPressXML(xmlPath: string): Promise<WPPost[]> {
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlContent);
  
  const channel = result.rss.channel;
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  
  const parsedPosts: WPPost[] = [];
  
  for (const item of items) {
    const postType = item['wp:post_type'];
    const status = item['wp:status'];
    
    if (postType !== 'post' || status !== 'publish') continue;
    
    const postDate = item['wp:post_date'] || '';
    
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
    
    let content = item['content:encoded'] || '';
    if (typeof content === 'object') content = '';
    
    content = cleanContent(content);
    
    let featuredImage: string | undefined;
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      featuredImage = imgMatch[1];
    }
    
    parsedPosts.push({
      id: parseInt(item['wp:post_id'] || '0', 10),
      title: decodeHtmlEntities(item.title || 'Untitled'),
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
  
  parsedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return parsedPosts;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—');
}

function cleanContent(content: string): string {
  content = content.replace(/\[(?:vc_|nectar_|slidepress)[^\]]*\]/g, '');
  content = content.replace(/\[\/(?:vc_|nectar_)[^\]]*\]/g, '');
  
  content = content.replace(
    /https?:\/\/(?:www\.)?pennquinn\.com\/wp-content\/uploads\//g,
    '/uploads/'
  );
  content = content.replace(
    /http:\/\/live-pennquinn\.pantheonsite\.io\/wp-content\/uploads\//g,
    '/uploads/'
  );
  
  content = content.replace(/<p>\s*<\/p>/g, '');
  content = content.replace(/\n\n+/g, '\n\n');
  
  content = decodeHtmlEntities(content);
  
  return content.trim();
}

async function main() {
  const xmlPath = 'attached_assets/pennquinncom.WordPress.2025-10-06_1769958592108.xml';
  
  console.log('Parsing WordPress XML for ALL posts...');
  const wpPosts = await parseWordPressXML(xmlPath);
  console.log(`Found ${wpPosts.length} published posts`);
  
  console.log('Clearing existing posts from database...');
  await db.delete(posts);
  
  console.log('Inserting posts into database...');
  let inserted = 0;
  const batchSize = 50;
  
  for (let i = 0; i < wpPosts.length; i += batchSize) {
    const batch = wpPosts.slice(i, i + batchSize);
    
    const postValues = batch.map(post => ({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage || null,
      galleryImages: [],
      categories: post.categories,
      tags: post.tags,
      date: new Date(post.date),
      status: 'publish',
      type: 'post',
    }));
    
    await db.insert(posts).values(postValues);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${wpPosts.length} posts...`);
  }
  
  console.log(`\nDone! Successfully imported ${inserted} posts to database.`);
  
  const allCategories = new Set<string>();
  const allTags = new Set<string>();
  for (const post of wpPosts) {
    post.categories.forEach(c => allCategories.add(c));
    post.tags.forEach(t => allTags.add(t));
  }
  
  console.log(`\nCategories (${allCategories.size}): ${Array.from(allCategories).sort().join(', ')}`);
  console.log(`Tags (${allTags.size}): ${Array.from(allTags).slice(0, 30).join(', ')}...`);
}

main().catch(console.error);
