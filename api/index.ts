/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { startServer } from '../server.js';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  // Lazily boostrap the full Express application (including Firestore sync)
  if (!cachedApp) {
    cachedApp = await startServer();
  }
  // Let Express handle the request routing
  return cachedApp(req, res);
}
