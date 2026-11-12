import { CardData } from '../types/album';
import { STORAGE_KEY, createBlankCard } from './constants';

const DB_NAME = 'ShipsAlbumDB';
const DB_VERSION = 1;
const STORE_CARDS = 'cards_store';
const STORE_AUDIO = 'audio_store';

let dbInstance: IDBDatabase | null = null;

/**
 * Initializes and returns the IndexedDB database instance.
 */
export function openAlbumDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        db.createObjectStore(STORE_CARDS);
      }

      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir la base de datos IndexedDB.'));
    };
  });
}

export interface StoredAlbumPayload {
  cards: CardData[];
  cur: string;
  lastBackup: number | null;
}

/**
 * Loads cards from IndexedDB, with automatic fallback and migration from localStorage.
 */
export async function loadAlbumData(): Promise<StoredAlbumPayload> {
  try {
    const db = await openAlbumDB();
    const payload = await new Promise<StoredAlbumPayload | null>((resolve) => {
      const transaction = db.transaction(STORE_CARDS, 'readonly');
      const store = transaction.objectStore(STORE_CARDS);
      const req = store.get('album_data');

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });

    if (payload && Array.isArray(payload.cards) && payload.cards.length > 0) {
      const cleanCards = payload.cards.map((c: Partial<CardData>) => ({
        ...createBlankCard(),
        ...c,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
      return {
        cards: cleanCards,
        cur: payload.cur || cleanCards[0]?.id || 'card-1',
        lastBackup: payload.lastBackup || null,
      };
    }
  } catch (err) {
    console.warn('No se pudo acceder a IndexedDB, revisando localStorage:', err);
  }

  // Fallback and migration from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        const cleanCards = parsed.cards.map((c: Partial<CardData>) => ({
          ...createBlankCard(),
          ...c,
          tags: Array.isArray(c.tags) ? c.tags : [],
        }));

        const result: StoredAlbumPayload = {
          cards: cleanCards,
          cur: parsed.cur || cleanCards[0]?.id || 'card-1',
          lastBackup: parsed.lastBackup || null,
        };

        // Migrar silenciosamente a IndexedDB
        saveAlbumData(result.cards, result.cur, result.lastBackup).catch(() => {});

        return result;
      }
    }
  } catch (e) {
    console.warn('Error leyendo localStorage:', e);
  }

  // Default initial card
  const defaultCard = createBlankCard();
  return {
    cards: [defaultCard],
    cur: defaultCard.id,
    lastBackup: null,
  };
}

/**
 * Saves cards to IndexedDB (preventing 5MB quota errors), and attempts a lightweight mirror to localStorage.
 */
export async function saveAlbumData(
  cards: CardData[],
  currentCardId: string,
  lastBackup: number | null
): Promise<void> {
  const payload: StoredAlbumPayload = {
    cards,
    cur: currentCardId,
    lastBackup,
  };

  try {
    const db = await openAlbumDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_CARDS, 'readwrite');
      const store = transaction.objectStore(STORE_CARDS);
      const req = store.put(payload, 'album_data');

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error guardando en IndexedDB:', err);
  }

  // Optional mirror to localStorage (ignoring quota errors)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota reached on localStorage is normal when storing high-res images,
    // IndexedDB now safely handles the persistence.
  }
}

/**
 * Saves an uploaded audio file (Blob/File) associated with a card ID into IndexedDB.
 */
export async function saveCardAudio(
  cardId: string,
  audioBlob: Blob,
  fileName: string
): Promise<void> {
  try {
    const db = await openAlbumDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_AUDIO, 'readwrite');
      const store = transaction.objectStore(STORE_AUDIO);
      const req = store.put({ blob: audioBlob, fileName, timestamp: Date.now() }, cardId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error guardando audio en IndexedDB:', err);
  }
}

/**
 * Retrieves the stored audio file associated with a card ID.
 */
export async function getCardAudio(
  cardId: string
): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const db = await openAlbumDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_AUDIO, 'readonly');
      const store = transaction.objectStore(STORE_AUDIO);
      const req = store.get(cardId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Deletes stored audio file for a card ID.
 */
export async function deleteCardAudio(cardId: string): Promise<void> {
  try {
    const db = await openAlbumDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_AUDIO, 'readwrite');
      const store = transaction.objectStore(STORE_AUDIO);
      const req = store.delete(cardId);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore error
  }
}
