import { db } from "./db";
import { posts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function migrateDataIfNeeded() {
  try {
    // Check if production database has any posts
    const result = await db.select({ count: sql<number>`count(*)` }).from(posts);
    const count = Number(result[0]?.count || 0);
    
    if (count > 0) {
      console.log(`[Migration] Database already has ${count} posts, skipping migration`);
      return;
    }
    
    console.log('[Migration] Database is empty, importing posts from bundled data...');
    
    // Import the bundled posts data
    const postsData = await import("../posts-data.json");
    const postsArray = postsData.default || postsData;
    
    if (!Array.isArray(postsArray) || postsArray.length === 0) {
      console.log('[Migration] No posts data found to import');
      return;
    }
    
    // Insert posts in batches
    const batchSize = 50;
    for (let i = 0; i < postsArray.length; i += batchSize) {
      const batch = postsArray.slice(i, i + batchSize);
      await db.insert(posts).values(batch.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        date: new Date(p.date),
        content: p.content,
        excerpt: p.excerpt,
        status: p.status,
        type: p.type,
        categories: p.categories,
        tags: p.tags,
        featuredImage: p.featuredImage,
        galleryImages: p.galleryImages,
      }))).onConflictDoNothing();
      console.log(`[Migration] Imported posts ${i + 1} to ${Math.min(i + batchSize, postsArray.length)}`);
    }
    
    // Update the sequence to avoid ID conflicts
    const maxId = await db.select({ max: sql<number>`max(id)` }).from(posts);
    if (maxId[0]?.max) {
      await db.execute(sql`SELECT setval('posts_id_seq', ${maxId[0].max + 1}, false)`);
    }
    
    console.log(`[Migration] Successfully imported ${postsArray.length} posts`);
  } catch (error) {
    console.error('[Migration] Error migrating data:', error);
  }
}
