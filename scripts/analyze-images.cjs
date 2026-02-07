const { Pool } = require("pg");

const pool = new Pool({
  host: "ls-6a2c055e68703232d005b2538032dfdff31b2682.cfjrgltnykyd.us-west-2.rds.amazonaws.com",
  port: 5432,
  database: "pennquinn",
  user: "dbmasteruser",
  password: "PennQuinn2024db",
  ssl: { rejectUnauthorized: false }
});

async function analyze() {
  // Get all posts
  const allPosts = await pool.query(`SELECT id, slug, title, featured_image, content FROM posts`);

  let hasFeatured = 0;
  let missingButHasContentImg = 0;
  let missingButHasVideo = 0;
  let trulyMissing = 0;

  const postsWithContentImages = [];
  const postsWithVideos = [];
  const postsTrulyMissing = [];

  for (const post of allPosts.rows) {
    const hasFeaturedImg = post.featured_image && post.featured_image.trim() !== '';
    const hasContentImg = /<img[^>]+src=["']([^"']+)["']/.test(post.content);
    const hasVideo = /vimeo|youtube|youtu\.be/i.test(post.content);

    if (hasFeaturedImg) {
      hasFeatured++;
    } else if (hasContentImg) {
      missingButHasContentImg++;
      // Extract first image
      const match = post.content.match(/<img[^>]+src=["']([^"']+)["']/);
      postsWithContentImages.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        firstImage: match ? match[1] : null
      });
    } else if (hasVideo) {
      missingButHasVideo++;
      postsWithVideos.push({ id: post.id, slug: post.slug, title: post.title });
    } else {
      trulyMissing++;
      postsTrulyMissing.push({ id: post.id, slug: post.slug, title: post.title });
    }
  }

  console.log("\n=== IMAGE ANALYSIS ===\n");
  console.log(`Posts with featured image set: ${hasFeatured}`);
  console.log(`Posts missing featured but have content images: ${missingButHasContentImg}`);
  console.log(`Posts missing featured but have videos: ${missingButHasVideo}`);
  console.log(`Posts truly missing any visual: ${trulyMissing}`);
  console.log(`\nTotal: ${allPosts.rows.length}`);

  console.log("\n=== SAMPLE: Posts with content images (first 5) ===");
  postsWithContentImages.slice(0, 5).forEach(p => {
    console.log(`  [${p.id}] ${p.title}`);
    console.log(`      Image: ${p.firstImage?.substring(0, 80)}...`);
  });

  console.log("\n=== Posts truly missing images (all) ===");
  postsTrulyMissing.forEach(p => {
    console.log(`  [${p.id}] ${p.title} (/post/${p.slug})`);
  });

  pool.end();
}

analyze().catch(e => {
  console.error("Error:", e);
  pool.end();
  process.exit(1);
});
