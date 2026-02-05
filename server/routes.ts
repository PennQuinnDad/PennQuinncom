import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, updatePostSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uploadDir = path.join(process.cwd(), 'uploads', String(year), month);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Fetch Vimeo video metadata
  app.get("/api/vimeo/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
      if (!response.ok) {
        return res.status(404).json({ error: "Video not found" });
      }
      const data = await response.json();
      
      // Try to get upload date from the v2 API (public, no auth needed)
      let uploadDate = null;
      try {
        const v2Response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
        if (v2Response.ok) {
          const v2Data = await v2Response.json();
          if (v2Data[0]?.upload_date) {
            uploadDate = v2Data[0].upload_date;
          }
        }
      } catch (e) {
        // v2 API might not work for all videos, ignore errors
      }
      
      res.json({
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail_url,
        uploadDate,
        duration: data.duration,
        author: data.author_name,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video metadata" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getAllPosts();
      console.log(`[API] Fetched ${posts.length} posts`);
      res.json(posts);
    } catch (error) {
      console.error("[API] Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts", details: String(error) });
    }
  });

  app.get("/api/posts/:slug", async (req, res) => {
    try {
      const post = await storage.getPostBySlug(req.params.slug);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const post = await storage.createPost(parsed.data);
      res.status(201).json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }
      const parsed = updatePostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const post = await storage.updatePost(id, parsed.data);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", isAuthenticated, async (req, res) => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }
      const deleted = await storage.deletePost(id);
      if (!deleted) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Image upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Generate the public URL path
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const imagePath = `/uploads/${year}/${month}/${req.file.filename}`;
      
      res.json({ 
        url: imagePath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  return httpServer;
}
