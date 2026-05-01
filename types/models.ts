export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'de';

export type Theme = 'dark' | 'light';

export type GroupingMode = 'none' | 'year' | 'month' | 'day';

export type MorningStarPersona = string;

export interface Principle {
  id: string;
  text: string;
  year: number;
  date?: string; // New: Optional full date for entry-derived principles
  createdAt: number;
  showOnHome: boolean; // New: Whether to display on the landing page
  containerId?: string; // New: Link to a storage container
}

export interface Container {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: number;
}

export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other';
  data: string; // Base64 or Blob URL (Base64 for persistence)
  name: string;
  mimeType: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number; // New: Last modified timestamp for sync resolution
  tags: string[];
  isLocked: boolean;
  isEncrypted?: boolean; // New: Whether the content is encrypted with a master password
  isArchived?: boolean; // New field for Bio-Vault
  migrated?: boolean; // Added for space separation
  archivedToShip?: boolean; // Added for space separation
  unlockAt?: number; // New: Time when the entry becomes accessible
  morningStarAnalysis?: string; // Persisted Morning Star result
  morningStarPersona?: MorningStarPersona; // Deprecated: single persona
  morningStarPersonas?: string[]; // New: multiple personas
  reflection?: string; // New: User reflection on the entry
  attachment?: Attachment; // New: Media attachment
  containerId?: string; // New: The storage package this entry belongs to
}

export enum AppState {
  COVER = 'COVER', // New Landing Page (Includes Fragments)
  ONBOARDING = 'ONBOARDING', // Initial Setup
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
  ARCHIVE = 'ARCHIVE', // Bio-Vault
}
