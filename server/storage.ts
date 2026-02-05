import { type Post, type InsertPost, type UpdatePost, posts } from "@shared/schema";
import { db } from "./db";
import { eq, desc, like } from "drizzle-orm";

export interface IStorage {
  getAllPosts(): Promise<Post[]>;
  getPostById(id: number): Promise<Post | undefined>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  getUniqueSlug(baseSlug: string, excludeId?: number): Promise<string>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: UpdatePost): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAllPosts(): Promise<Post[]> {
    return db.select().from(posts).orderBy(desc(posts.date));
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post;
  }

  async getUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    // Find all posts with slugs that start with this base slug
    const existingPosts = await db
      .select({ slug: posts.slug, id: posts.id })
      .from(posts)
      .where(like(posts.slug, `${baseSlug}%`));
    
    // Filter out the current post if we're updating
    const slugs = existingPosts
      .filter(p => excludeId === undefined || p.id !== excludeId)
      .map(p => p.slug);
    
    // If base slug is available, use it
    if (!slugs.includes(baseSlug)) {
      return baseSlug;
    }
    
    // Otherwise, find the next available number
    let counter = 2;
    while (slugs.includes(`${baseSlug}-${counter}`)) {
      counter++;
    }
    return `${baseSlug}-${counter}`;
  }

  async createPost(post: InsertPost): Promise<Post> {
    // Ensure unique slug before inserting
    const uniqueSlug = await this.getUniqueSlug(post.slug);
    const [newPost] = await db.insert(posts).values({ ...post, slug: uniqueSlug }).returning();
    return newPost;
  }

  async updatePost(id: number, post: UpdatePost): Promise<Post | undefined> {
    // If slug is being updated, ensure it's unique
    if (post.slug) {
      post.slug = await this.getUniqueSlug(post.slug, id);
    }
    const [updatedPost] = await db.update(posts).set(post).where(eq(posts.id, id)).returning();
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
