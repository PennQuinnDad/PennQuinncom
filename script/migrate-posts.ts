import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";
import postsData from "../client/src/data/posts.json";

async function migratePostsToDatabase() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  console.log(`Migrating ${postsData.length} posts to database...`);

  for (const post of postsData) {
    try {
      await db.insert(schema.posts).values({
        title: post.title,
        slug: post.slug,
        date: new Date(post.date),
        content: post.content || "",
        excerpt: post.excerpt || "",
        status: post.status || "publish",
        type: post.type || "post",
        categories: post.categories || [],
        tags: post.tags || [],
        featuredImage: post.featuredImage || null,
      }).onConflictDoNothing();
      console.log(`✓ Migrated: ${post.title}`);
    } catch (error) {
      console.error(`✗ Failed to migrate: ${post.title}`, error);
    }
  }

  console.log("Migration complete!");
  await pool.end();
}

migratePostsToDatabase().catch(console.error);
