import { Request, Response, NextFunction } from 'express';

const WINDOW = 60_000; // 1 minute
const MAX = 120; // max 120 requests per minute
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  // If we are in local development testing, we might want to bypass rate limiting or keep it high
  const ip = (req.ip || req.headers['x-forwarded-for'] || 'local') as string;
  const now = Date.now();
  
  const rec = hits.get(ip) || { count: 0, reset: now + WINDOW };
  
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + WINDOW;
  }
  
  rec.count++;
  hits.set(ip, rec);
  
  if (rec.count > MAX) {
    return res.status(429).json({
      error: 'rate_limited',
      retry_after: Math.ceil((rec.reset - now) / 1000)
    });
  }
  
  next();
}
