import * as FileSystem from 'expo-file-system';
import { uploadAPI } from './api';

/**
 * Upload a file from a local URI to S3 via base64 encoding
 * More reliable on Android than presigned URL + blob approach
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
  const ext = uriParts[uriParts.length - 1]?.split('?')[0] || 'jpg';
  const fileName = `upload_${Date.now()}.${ext}`;

  // Read file as base64 using expo-file-system (reliable on all platforms)
  const base64Data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload via base64 endpoint (server-side S3 upload)
  const { data } = await uploadAPI.base64({
    data: base64Data,
    fileName,
    fileType,
    folder,
  });

  return data.fileUrl;
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
