import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://noidacircle-api-backend.vercel.app';

/**
 * Get auth token from storage
 */
async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('nc_token');
}

/**
 * Upload a file from a local URI to S3
 * Uses presigned URL first (direct S3 upload), falls back to base64
 * Does NOT depend on uploadAPI import to avoid undefined reference issues
 */
export async function uploadFile(
  uri: string,
  folder: string = 'posts',
  fileType: string = 'image/jpeg'
): Promise<string> {
  const uriParts = uri.split('.');
  const ext = uriParts[uriParts.length - 1]?.split('?')[0] || 'jpg';
  const fileName = `upload_${Date.now()}.${ext}`;

  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  // Method 1: Presigned URL upload (direct to S3, bypasses Vercel body limits)
  try {
    const presignedRes = await fetch(`${API_BASE}/api/upload/presigned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, fileType, folder }),
    });

    if (presignedRes.ok) {
      const presignedData = await presignedRes.json();
      const { presignedUrl, fileUrl } = presignedData;

      if (presignedUrl && fileUrl) {
        // Upload directly to S3 using expo-file-system
        const uploadResult = await FileSystem.uploadAsync(presignedUrl, uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': fileType,
          },
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          return fileUrl;
        }
        console.log('S3 direct upload failed with status:', uploadResult.status);
      }
    } else {
      console.log('Presigned URL request failed:', presignedRes.status);
    }
  } catch (presignedError: any) {
    console.log('Presigned upload error:', presignedError.message);
  }

  // Method 2: Base64 upload (through backend)
  try {
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const base64Res = await fetch(`${API_BASE}/api/upload/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: base64Data,
        fileName,
        fileType,
        folder,
      }),
    });

    if (!base64Res.ok) {
      const errData = await base64Res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${base64Res.status}`);
    }

    const result = await base64Res.json();
    if (!result.fileUrl) {
      throw new Error('Upload succeeded but no file URL returned');
    }
    return result.fileUrl;
  } catch (base64Error: any) {
    console.log('Base64 upload error:', base64Error.message);
    throw base64Error;
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase()?.split('?')[0];
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
