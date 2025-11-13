import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Allowed file types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain',
  'text/csv',
  'application/json',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadedFile {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      filter: function ({ mimetype }) {
        // Validate file type
        return ALLOWED_MIME_TYPES.includes(mimetype || '');
      },
    });

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);

    const uploadedFiles: UploadedFile[] = [];

    // Process each uploaded file
    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (!fileArray || fileArray.length === 0) continue;

      for (const file of fileArray) {
        // Validate file
        if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          // Delete invalid file
          if (file.filepath) {
            fs.unlinkSync(file.filepath);
          }
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          // Delete oversized file
          if (file.filepath) {
            fs.unlinkSync(file.filepath);
          }
          continue;
        }

        // Generate safe filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const ext = path.extname(file.originalFilename || '');
        const safeFilename = `${timestamp}-${randomString}${ext}`;
        const newPath = path.join(uploadDir, safeFilename);

        // Move file to final location
        fs.renameSync(file.filepath, newPath);

        // Create file record
        uploadedFiles.push({
          filename: safeFilename,
          originalFilename: file.originalFilename || 'unknown',
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          url: `/uploads/${safeFilename}`,
        });

        console.log('[C1 Upload] File uploaded:', {
          original: file.originalFilename,
          saved: safeFilename,
          size: file.size,
          type: file.mimetype,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid files uploaded',
      });
    }

    return res.status(200).json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error: any) {
    console.error('[C1 Upload] Error:', error);

    // Handle specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed',
    });
  }
}
