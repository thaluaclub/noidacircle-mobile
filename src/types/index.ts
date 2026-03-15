// User types
export interface PostAuthor {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  is_verified: boolean;
  verification_badge?: string | null;
  account_type?: string;
}

// Story types
export interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  media_type: 'image' | 'video' | 'text';
  bg_color: string | null;
  text_content: string | null;
  expires_at: string;
  views_count: number;
  created_at: string;
  is_viewed: boolean;
}

export interface StoryGroup {
  user: PostAuthor;
  stories: Story[];
  latest_at: string;
  has_unviewed: boolean;
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  description: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | 'carousel' | null;
  category: string;
  visibility: 'public' | 'private' | 'followers';
  likes_count: number;
  comments_count: number;
  shares_count: number; // Used as views_count
  is_pinned: boolean;
  is_archived: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  user: PostAuthor;
  // Enriched by backend
  is_liked: boolean;
  is_following: boolean | null;
  is_own: boolean;
  is_downvoted?: boolean;
  downvotes_count?: number;
  // Quote post enrichment
  quoted_post?: Post | null;
  // Client-side (for bookmarks)
  is_bookmarked?: boolean;
}

// Comment types
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  likes_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user: PostAuthor;
  // Enriched
  reply_count: number;
  is_liked: boolean;
  // Client-side
  replies?: Comment[];
  showReplies?: boolean;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Responses
export interface FeedResponse {
  posts: Post[];
  pagination: Pagination;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: Pagination;
}

export interface RepliesResponse {
  replies: Comment[];
  pagination: Pagination;
}

// Upload
export interface PresignedResponse {
  presignedUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
  maxSize: number;
  mediaType: 'image' | 'video' | 'document';
}

// Search user result
export interface SearchUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_private: boolean;
  account_type: string | null;
  verification_badge: string | null;
  account_category: string | null;
}

export interface SearchUsersResponse {
  users: SearchUser[];
  pagination: Pagination;
}

// Create post
export interface CreatePostData {
  content: string;
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'followers';
  media_url?: string;
  media_type?: 'image' | 'video' | 'carousel';
  category?: string;
}
