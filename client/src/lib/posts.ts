import { apiRequest } from './queryClient';

export interface Post {
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
  featuredImage?: string | null;
  galleryImages: string[];
}

export async function fetchAllPosts(): Promise<Post[]> {
  const res = await apiRequest('GET', '/api/posts');
  return res.json();
}

export async function fetchPostBySlug(slug: string): Promise<Post> {
  const res = await apiRequest('GET', `/api/posts/${slug}`);
  return res.json();
}

export async function createPost(post: Omit<Post, 'id'>): Promise<Post> {
  const res = await apiRequest('POST', '/api/posts', post);
  return res.json();
}

export async function updatePost(id: number, post: Partial<Post>): Promise<Post> {
  const res = await apiRequest('PUT', `/api/posts/${id}`, post);
  return res.json();
}

export async function deletePost(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/posts/${id}`);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function extractFirstImage(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
