import { uploadAPI } from './api';
import type { PresignedResponse } from '../types';

/**
 * Upload a file from a local URI to S3 via presigned URL
 * @param uri - Local file URI (from expo-image-picker)
 * @param folder - S3 folder (e.g., 'posts', 'profiles')
 * @param fileType - MIME type (e.g., 'image/jpeg')
 * @returns The public S3 URL of the uploaded file
 */
export async function uploadFile(
  uri: string,
  folder: string = 'posts',
  fileType: string = 'image/jpeg'
): Promise<string> {
  // Extract file extension from URI
  const uriParts = uri.split('.');
  const ext = uriParts[uriParts.length - 1] || 'jpg';
  const fileName = `upload_${Date.now()}.${ext}`;

  // Get presigned URL from backend
  const { data } = await uploadAPI.presigned({
    fileName,
    fileType,
    folder,
  });

  const presigned: PresignedResponse = data;

  // Fetch the local file as blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Upload to S3
  await fetch(presigned.presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': fileType,
    },
    body: blob,
  });

  return presigned.fileUrl;
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  };
  return mimeMap[ext || ''] || 'image/jpeg';
}
