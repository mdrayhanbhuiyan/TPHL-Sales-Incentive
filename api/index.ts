/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { startServer } from '../server';

// Statically import the JSON store to ensure Vercel's NFT (Node File Trace)
// bundles db-store.json directly in the deployed lambda function.
import '../db-store.json';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  // Normalize req.url to prevent mismatched paths due to Vercel's rewrite engine
  if (req.url) {
    console.log(`[Vercel Handler] Original req.url: ${req.url}`);
    
    // If the path was rewritten such that the /api prefix was trimmed, prepending /api
    if (!req.url.startsWith('/api') && req.url !== '/' && !req.url.startsWith('/index')) {
      req.url = `/api${req.url}`;
    }
    
    // If Vercel explicitly matched and mapped the handler name itself in the request URL
    if (req.url.startsWith('/api/index.ts')) {
      req.url = req.url.replace('/api/index.ts', '/api');
    } else if (req.url.startsWith('/api/index')) {
      req.url = req.url.replace('/api/index', '/api');
    }
    
    console.log(`[Vercel Handler] Normalized req.url: ${req.url}`);
  }

  // Lazily bootstrap the full Express application (including Firestore sync)
  if (!cachedApp) {
    cachedApp = await startServer();
  }
  // Let Express handle the request routing
  return cachedApp(req, res);
}
