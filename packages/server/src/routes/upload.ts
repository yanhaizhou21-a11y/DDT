import { Router } from 'express';
import path from 'path';
import fs from 'fs';

export function createUploadRouter(uploadsDir: string): Router {
  const router = Router();

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // POST /api/upload - Upload base64 or dataURI image (Max 5MB)
  router.post('/', async (req, res) => {
    try {
      const { image, filename: originalFilename } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'No image data provided.' });
      }

      // Check for data URI prefix
      const match = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      let ext = 'jpg';
      let base64Data = image;

      if (match) {
        let rawExt = match[1].toLowerCase();
        if (rawExt === 'jpeg') rawExt = 'jpg';
        if (rawExt === 'svg+xml') rawExt = 'svg';
        ext = ['jpg', 'png', 'webp', 'gif', 'svg'].includes(rawExt) ? rawExt : 'jpg';
        base64Data = match[2];
      } else if (originalFilename) {
        const fileExt = path.extname(originalFilename).replace('.', '').toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt)) {
          ext = fileExt === 'jpeg' ? 'jpg' : fileExt;
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const maxBytes = 5 * 1024 * 1024; // 5 MB

      if (buffer.length > maxBytes) {
        return res.status(400).json({
          error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 5 MB limit.`,
        });
      }

      const uniqueName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);

      await fs.promises.writeFile(filePath, buffer);

      const fileUrl = `/uploads/${uniqueName}`;
      res.json({
        success: true,
        url: fileUrl,
        filename: uniqueName,
        size: buffer.length,
      });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: err.message || 'Failed to upload image' });
    }
  });

  return router;
}
