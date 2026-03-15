import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://noidacircle-api-backend.vercel.app';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

// Token interceptor — reads from AsyncStorage
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('nc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 interceptor — clears auth and signals logout
let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorized = callback;
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('nc_token');
      await AsyncStorage.removeItem('nc_user');
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

// Auth API
export const authAPI = {
  signup: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  // Phone OTP auth
  sendOTP: (phone: string) =>
    api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone: string, otp: string) =>
    api.post('/auth/verify-otp', { phone, otp }),
};

// Users API
export const usersAPI = {
  me: () => api.get('/users/me'),
  getProfile: (id: string) => api.get(`/users/${id}`),
  search: (q: string) => api.get(`/users/search?q=${q}`),
  updateProfile: (data: any) => api.put('/users/me', data),
  updateUsername: (username: string) =>
    api.put('/users/me/username', { username }),
  updateAccountType: (data: any) => api.put('/users/me/account-type', data),
};

// Posts API
export const postsAPI = {
  getFeed: (page = 1, limit = 20, feedType?: string) => {
    let url = `/posts/feed?page=${page}&limit=${limit}`;
    if (feedType && feedType !== 'all') url += `&type=${feedType}`;
    return api.get(url);
  },
  getAll: (page = 1, limit = 20) =>
    api.get(`/posts/explore?page=${page}&limit=${limit}`),
  getReels: (page = 1, limit = 20) =>
    api.get(`/posts/reels?page=${page}&limit=${limit}`),
  getUserPosts: (userId: string, page = 1) =>
    api.get(`/posts/user/${userId}?page=${page}`),
  getById: (id: string) => api.get(`/posts/${id}`),
  create: (data: any) => api.post('/posts', data),
  update: (id: string, data: any) => api.put(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  pin: (id: string) => api.post(`/posts/${id}/pin`),
  archive: (id: string) => api.post(`/posts/${id}/archive`),
  vote: (id: string, optionIndex: number) => api.post(`/posts/${id}/vote`, { optionIndex }),
  getPoll: (id: string) => api.get(`/posts/${id}/poll`),
  recordView: (id: string) => api.post(`/posts/${id}/view`),
};

// Comments API
export const commentsAPI = {
  getByPost: (postId: string, page = 1) =>
    api.get(`/comments/post/${postId}?page=${page}`),
  replies: (commentId: string) =>
    api.get(`/comments/${commentId}/replies`),
  create: (postId: string, data: any) =>
    api.post(`/comments/post/${postId}`, data),
  update: (id: string, data: any) => api.put(`/comments/${id}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`),
};

// Likes API
export const likesAPI = {
  likePost: (id: string) => api.post(`/likes/post/${id}`),
  unlikePost: (id: string) => api.delete(`/likes/post/${id}`),
  likeComment: (id: string) => api.post(`/likes/comment/${id}`),
  unlikeComment: (id: string) => api.delete(`/likes/comment/${id}`),
  postLikers: (id: string) => api.get(`/likes/post/${id}/users`),
  downvotePost: (id: string) => api.post(`/likes/post/${id}/downvote`),
  removeDownvote: (id: string) => api.delete(`/likes/post/${id}/downvote`),
};

// Follow API
export const followAPI = {
  follow: (id: string) => api.post(`/follow/${id}`),
  unfollow: (id: string) => api.delete(`/follow/${id}`),
  followers: (id: string, page = 1) =>
    api.get(`/follow/${id}/followers?page=${page}`),
  following: (id: string, page = 1) =>
    api.get(`/follow/${id}/following?page=${page}`),
};

// Messages API
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (data: any) =>
    api.post('/messages/conversations', data),
  getMessages: (convId: string, limit = 50) =>
    api.get(`/messages/${convId}?limit=${limit}`),
  send: (convId: string, data: any) =>
    api.post(`/messages/${convId}`, data),
  editMessage: (convId: string, msgId: string, data: any) =>
    api.put(`/messages/${convId}/${msgId}`, data),
  deleteMessage: (convId: string, msgId: string) =>
    api.delete(`/messages/${convId}/${msgId}`),
  muteConversation: (convId: string, muted: boolean) =>
    api.post(`/messages/${convId}/mute`, { muted }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  registerPushToken: (token: string, platform: string) =>
    api.post('/notifications/push-token', { token, platform }),
  removePushToken: (token: string) =>
    api.delete('/notifications/push-token', { data: { token } }),
  subscribe: (targetId: string) =>
    api.post(`/notifications/subscribe/${targetId}`),
  unsubscribe: (targetId: string) =>
    api.delete(`/notifications/subscribe/${targetId}`),
  checkSubscription: (targetId: string) =>
    api.get(`/notifications/subscribe/${targetId}/check`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: any) =>
    api.put('/notifications/preferences', data),
};

// Recommendations API
export const recommendationsAPI = {
  suggestedUsers: (limit = 5) => api.get(`/users/suggestions?limit=${limit}`),
  suggestedCommunities: (limit = 5) => api.get(`/communities/suggestions?limit=${limit}`),
  suggestedBrands: (limit = 5) => api.get(`/users/suggestions?limit=${limit}&type=business`),
};

// Upload API
export const uploadAPI = {
  presigned: (data: any) => api.post('/upload/presigned', data),
  base64: (data: any) => api.post('/upload/base64', data),
  profileImage: (data: any) => api.post('/upload/profile-image', data),
  deleteFile: (key: string) => api.delete('/upload', { data: { key } }),
};

// Bookmarks API
export const bookmarksAPI = {
  getAll: (page = 1) => api.get(`/bookmarks?page=${page}`),
  bookmark: (postId: string) => api.post(`/bookmarks/${postId}`),
  unbookmark: (postId: string) => api.delete(`/bookmarks/${postId}`),
  check: (postId: string) => api.get(`/bookmarks/check/${postId}`),
};

// Communities API
export const communitiesAPI = {
  getAll: (page = 1, limit = 20, type?: string, search?: string) => {
    let url = `/communities?page=${page}&limit=${limit}`;
    if (type && type !== 'all') url += `&type=${type}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return api.get(url);
  },
  getMy: () => api.get('/communities/my'),
  getById: (id: string) => api.get(`/communities/${id}`),
  create: (data: any) => api.post('/communities/create', data),
  join: (id: string) => api.post(`/communities/${id}/join`),
  leave: (id: string) => api.delete(`/communities/${id}/leave`),
  getMembers: (id: string, page = 1) =>
    api.get(`/communities/${id}/members?page=${page}`),
  getPosts: (id: string, page = 1) =>
    api.get(`/communities/${id}/posts?page=${page}`),
  createPost: (id: string, data: any) =>
    api.post(`/communities/${id}/posts`, data),
  deletePost: (id: string, postId: string) =>
    api.delete(`/communities/${id}/posts/${postId}`),
  getChat: (id: string) => api.get(`/communities/${id}/chat`),
  adminPending: () => api.get('/communities/admin/pending'),
  adminApprove: (id: string) =>
    api.put(`/communities/admin/approve/${id}`),
  adminReject: (id: string) =>
    api.put(`/communities/admin/reject/${id}`),
};

// Verification API
export const verificationAPI = {
  apply: (data: { reason: string; document_url?: string; social_links?: string; website_url?: string }) =>
    api.post('/verification/apply', data),
  myStatus: () => api.get('/verification/my-status'),
};

// Location & Nearby API
export const locationAPI = {
  updateLocation: (lat: number, lng: number) =>
    api.put('/users/me/location', { latitude: lat, longitude: lng }),
  nearbyUsers: (lat: number, lng: number, radius = 10, page = 1) =>
    api.get(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`),
  nearbyPosts: (lat: number, lng: number, radius = 10, page = 1) =>
    api.get(`/posts/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`),
  nearbyBusinesses: (lat: number, lng: number, radius = 10, page = 1) =>
    api.get(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}&type=business`),
  nearbyCommunities: (lat: number, lng: number, radius = 10, page = 1) =>
    api.get(`/communities/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`),
};


// Stories API
export const storiesAPI = {
  getFeed: () => api.get('/stories/feed'),
  create: (data: { media_url?: string; media_type: 'image' | 'video' | 'text'; caption?: string; bg_color?: string; text_content?: string }) =>
    api.post('/stories', data),
  markViewed: (id: string) => api.post(`/stories/${id}/view`),
  getMy: () => api.get('/stories/my'),
  delete: (id: string) => api.delete(`/stories/${id}`),
  getViewers: (id: string) => api.get(`/stories/${id}/viewers`),
};

export default api;

