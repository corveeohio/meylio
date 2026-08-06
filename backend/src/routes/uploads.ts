import { Router } from 'express';
import { getPhotoStream } from '../services/s3.js';

export const uploadsRouter = Router();

uploadsRouter.get('/:key', async (req, res) => {
  try {
    const { stream, contentType, contentLength } = await getPhotoStream(req.params.key);
    res.setHeader('Content-Type', contentType ?? 'application/octet-stream');
    if (contentLength) res.setHeader('Content-Length', String(contentLength));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    stream.pipe(res);
  } catch {
    res.status(404).end();
  }
});
