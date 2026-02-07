const { Pool } = require("pg");

const pool = new Pool({
  host: "ls-6a2c055e68703232d005b2538032dfdff31b2682.cfjrgltnykyd.us-west-2.rds.amazonaws.com",
  port: 5432,
  database: "pennquinn",
  user: "dbmasteruser",
  password: "PennQuinn2024db",
  ssl: { rejectUnauthorized: false }
});

// Extract video thumbnail URL from content
function getVideoThumbnail(content) {
  // YouTube patterns: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const youtubeMatch = content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }

  // Vimeo patterns: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch = content.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }

  return null;
}

async function extractVideoThumbnails() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(dryRun ? "\n=== DRY RUN MODE ===\n" : "\n=== EXTRACTING VIDEO THUMBNAILS ===\n");

  // Get posts without featured image but with video content
  const posts = await pool.query(`
    SELECT id, slug, title, content
    FROM posts
    WHERE (featured_image IS NULL OR featured_image = '')
    AND (content LIKE '%vimeo%' OR content LIKE '%youtube%' OR content LIKE '%youtu.be%')
  `);

  console.log(`Found ${posts.rows.length} posts with videos but no featured image\n`);

  let updated = 0;
  let failed = 0;

  for (const post of posts.rows) {
    const thumbnail = getVideoThumbnail(post.content);

    if (thumbnail) {
      if (dryRun) {
        console.log(`[DRY RUN] Would set featured_image for "${post.title}"`);
        console.log(`          Thumbnail: ${thumbnail}\n`);
      } else {
        try {
          await pool.query(
            `UPDATE posts SET featured_image = $1 WHERE id = $2`,
            [thumbnail, post.id]
          );
          console.log(`✓ Updated "${post.title}"`);
          console.log(`  Thumbnail: ${thumbnail}\n`);
          updated++;
        } catch (err) {
          console.error(`✗ Failed to update "${post.title}": ${err.message}`);
          failed++;
        }
      }
    } else {
      console.log(`? Could not extract video ID from "${post.title}"`);
      console.log(`  Content preview: ${post.content.substring(0, 100)}...\n`);
      failed++;
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total posts processed: ${posts.rows.length}`);
  if (!dryRun) {
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed/skipped: ${failed}`);
  }

  pool.end();
}

extractVideoThumbnails().catch(e => {
  console.error("Error:", e);
  pool.end();
  process.exit(1);
});
