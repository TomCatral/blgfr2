import type { Request, Response } from 'express';
import { createApp } from './server';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    if (req.query.path !== undefined) {
      const requestedPath = String(req.query.path).replace(/^\/+/, '');
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (key === 'path') continue;
        if (Array.isArray(value)) {
          value.forEach((item) => query.append(key, String(item)));
        } else if (value !== undefined) {
          query.append(key, String(value));
        }
      }
      req.url = `/api/${requestedPath}${query.size ? `?${query}` : ''}`;
    }
    appPromise ??= createApp();
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Backend initialization failed:', error);
    appPromise = undefined;
    return res.status(500).json({
      error: 'Backend initialization failed.',
      detail: error instanceof Error ? error.message : 'Unknown startup error',
    });
  }
}
