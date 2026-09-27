import { Request, Response, NextFunction } from 'express';

/**
 * Clean Express authentication middleware.
 * Verifies the presence and validity of the 'x-api-key' header.
 * Allows all localhost/local development connections in non-production.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.API_KEY;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Allow health checks
  if (req.path === '/health') {
    return next();
  }

  // Allow local connections in dev
  const isLocalhost = 
    req.hostname === 'localhost' || 
    req.hostname === '127.0.0.1' || 
    req.ip === '::1' || 
    req.ip === '127.0.0.1' ||
    req.headers.host?.includes('localhost') ||
    req.headers.host?.includes('127.0.0.1');

  if (isDevelopment && isLocalhost) {
    return next();
  }

  if (apiKey) {
    const clientKey = req.headers['x-api-key'];
    if (clientKey === apiKey) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing x-api-key header.' });
  }

  // If no API key is specified and we are in dev, allow
  next();
}
