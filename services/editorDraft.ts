import { AppStorageKeys } from './appSettings';
import { getStoredString, removeStoredValue, setStoredString } from './browserStorage';
import { SecurityService } from './securityService';

export interface EditorDraft {
  title: string;
  content: string;
  tags: string;
}

const emptyDraft: EditorDraft = {
  title: '',
  content: '',
  tags: '',
};

function safeGetItem(key: string): string {
  return getStoredString(key) ?? '';
}

function safeSetItem(key: string, value: string) {
  setStoredString(key, value);
}

function safeRemoveItem(key: string) {
  removeStoredValue(key);
}

export async function loadEditorDraft(masterPassword: string | null): Promise<EditorDraft> {
  const draftTitle = safeGetItem(AppStorageKeys.draftTitle);
  const draftContent = safeGetItem(AppStorageKeys.draftContent);
  const draftTags = safeGetItem(AppStorageKeys.draftTags);

  let content = '';
  if (draftContent) {
    if (masterPassword && draftContent.startsWith('ENC:')) {
      try {
        content = await SecurityService.decrypt(draftContent.slice(4), masterPassword);
      } catch {
        content = '';
      }
    } else if (!draftContent.startsWith('ENC:')) {
      content = draftContent;
    }
  }

  return {
    title: draftTitle,
    content,
    tags: draftTags,
  };
}

export async function saveEditorDraft(
  draft: EditorDraft,
  masterPassword: string | null
): Promise<{ saved: boolean }> {
  try {
    if (draft.title) {
      safeSetItem(AppStorageKeys.draftTitle, draft.title);
    } else {
      safeRemoveItem(AppStorageKeys.draftTitle);
    }

    if (draft.tags) {
      safeSetItem(AppStorageKeys.draftTags, draft.tags);
    } else {
      safeRemoveItem(AppStorageKeys.draftTags);
    }

    if (!draft.content) {
      safeRemoveItem(AppStorageKeys.draftContent);
      return { saved: true };
    }

    if (masterPassword) {
      try {
        const encrypted = await SecurityService.encrypt(draft.content, masterPassword);
        safeSetItem(AppStorageKeys.draftContent, `ENC:${encrypted}`);
        return { saved: true };
      } catch {
        safeRemoveItem(AppStorageKeys.draftContent);
        return { saved: false };
      }
    }

    safeSetItem(AppStorageKeys.draftContent, draft.content);
    return { saved: true };
  } catch {
    return { saved: false };
  }
}

export function clearEditorDraft() {
  safeRemoveItem(AppStorageKeys.draftTitle);
  safeRemoveItem(AppStorageKeys.draftContent);
  safeRemoveItem(AppStorageKeys.draftTags);
}

export function createEmptyEditorDraft(): EditorDraft {
  return { ...emptyDraft };
}
