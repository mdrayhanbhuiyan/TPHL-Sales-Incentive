/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize firebase client-side auth
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const gDriveAuth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive scope for file uploads and management
provider.addScope('https://www.googleapis.com/auth/drive.file');

export interface GoogleDriveUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  accessToken: string;
}

// Keep the token in memory safely
let cachedToken: string | null = null;
let cachedUser: GoogleDriveUser | null = null;

export async function loginToGoogleDrive(): Promise<GoogleDriveUser> {
  try {
    const result = await signInWithPopup(gDriveAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error("Failed to retrieve Google OAuth access token.");
    }

    cachedToken = token;
    cachedUser = {
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      accessToken: token
    };

    return cachedUser;
  } catch (err: any) {
    console.error("[googleDrive.ts] Sign-in error:", err);
    throw err;
  }
}

export async function logoutFromGoogleDrive(): Promise<void> {
  await signOut(gDriveAuth);
  cachedToken = null;
  cachedUser = null;
}

export function getCachedGoogleUser(): GoogleDriveUser | null {
  return cachedUser;
}

export function getCachedToken(): string | null {
  return cachedToken;
}

/**
 * Lists the TPHL Master backup files inside the user's Google Drive.
 */
export async function listGoogleDriveBackups(): Promise<any[]> {
  const token = getCachedToken();
  if (!token) throw new Error("Not logged in to Google Drive.");

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=name contains 'tphl_incentive_master_backup' and mimeType='application/json'&orderBy=createdTime desc&fields=files(id, name, createdTime, size)",
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google Drive API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.files || [];
}

/**
 * Downloads a backup from Google Drive and returns it parsed as JSON.
 */
export async function downloadGoogleDriveBackup(fileId: string): Promise<any> {
  const token = getCachedToken();
  if (!token) throw new Error("Not logged in to Google Drive.");

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google Drive download error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Uploads a master backup payload to the user's Google Drive.
 */
export async function uploadGoogleDriveBackup(backupData: any): Promise<{ id: string; name: string }> {
  const token = getCachedToken();
  if (!token) throw new Error("Not logged in to Google Drive.");

  const fileName = `tphl_incentive_master_backup_${new Date().toISOString().split('T')[0]}_${Math.floor(Date.now() / 1000)}.json`;
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'TPHL Incentive Commission Portal Master DB Backup File'
  };

  const fileContent = JSON.stringify(backupData, null, 2);

  // Multipart HTTP request body construction
  const boundary = 'tphl_gdrive_upload_boundary_xyz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive upload error: ${errText || response.statusText}`);
  }

  return response.json();
}
