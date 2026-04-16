import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type BetRecord = {
  id: string;
  numbers: number[];
  note: string;
  createdAt: string;
};

const LOCAL_BETS_KEY = 'megasena.bets';

function normalizeBet(input: Partial<BetRecord> & { id: string; numbers: number[] }): BetRecord {
  return {
    id: String(input.id),
    numbers: [...input.numbers].map(Number).sort((a, b) => a - b),
    note: String(input.note || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function readLocalBets(): BetRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(LOCAL_BETS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as BetRecord[];
    return parsed
      .map((item) => normalizeBet(item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function writeLocalBets(bets: BetRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_BETS_KEY, JSON.stringify(bets));
}

export async function fetchBets(): Promise<BetRecord[]> {
  if (!db) return readLocalBets();

  const snapshot = await getDocs(query(collection(db, 'bets'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => {
    const data = item.data() as Record<string, unknown>;
    const createdAt =
      typeof data.createdAt === 'object' && data.createdAt && 'toDate' in (data.createdAt as object)
        ? ((data.createdAt as { toDate: () => Date }).toDate().toISOString())
        : new Date().toISOString();

    return normalizeBet({
      id: item.id,
      numbers: Array.isArray(data.numbers) ? (data.numbers as number[]) : [],
      note: String(data.note || ''),
      createdAt,
    });
  });
}

export async function createBet(numbers: number[], note = '') {
  const clean = [...numbers].map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 60);
  const unique = [...new Set(clean)].sort((a, b) => a - b);

  if (unique.length !== 6) {
    throw new Error('Informe 6 dezenas unicas entre 1 e 60.');
  }

  if (!db) {
    const existing = readLocalBets();
    const next = normalizeBet({
      id: crypto.randomUUID(),
      numbers: unique,
      note,
      createdAt: new Date().toISOString(),
    });
    writeLocalBets([next, ...existing]);
    return next;
  }

  const ref = await addDoc(collection(db, 'bets'), {
    numbers: unique,
    note,
    createdAt: serverTimestamp(),
  });

  return normalizeBet({
    id: ref.id,
    numbers: unique,
    note,
    createdAt: new Date().toISOString(),
  });
}

export async function removeBet(id: string) {
  if (!db) {
    const existing = readLocalBets();
    writeLocalBets(existing.filter((item) => item.id !== id));
    return;
  }

  await deleteDoc(doc(db, 'bets', id));
}
