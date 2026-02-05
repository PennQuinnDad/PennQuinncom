import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  date: timestamp("date").notNull().defaultNow(),
  content: text("content").notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  status: text("status").notNull().default("publish"),
  type: text("type").notNull().default("post"),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  featuredImage: text("featured_image"),
  galleryImages: text("gallery_images").array().notNull().default(sql`'{}'::text[]`),
});

export const insertPostSchema = createInsertSchema(posts, {
  date: z.coerce.date(),
}).omit({
  id: true,
});

export const updatePostSchema = createInsertSchema(posts, {
  date: z.coerce.date(),
}).omit({
  id: true,
}).partial();

export type InsertPost = z.infer<typeof insertPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type Post = typeof posts.$inferSelect;
