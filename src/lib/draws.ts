import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import type { Draw } from '../types';
import { db } from './firebase';

type ImportSummary = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
};

type ParsedWorkbook = {
  draws: Draw[];
  skipped: number;
};

const LOCAL_DRAWS_KEY = 'megasena.draws';

const HEADER = {
  concurso: 'Concurso',
  date: 'Data do Sorteio',
  winners6: 'Ganhadores 6 acertos',
  cityUf: 'Cidade / UF',
  prize6: 'Rateio 6 acertos',
  winners5: 'Ganhadores 5 acertos',
  prize5: 'Rateio 5 acertos',
  winners4: 'Ganhadores 4 acertos',
  prize4: 'Rateio 4 acertos',
  accumulated6: 'Acumulado 6 acertos',
  totalRevenue: 'Arrecadacao Total',
  estimatedPrize: 'Estimativa premio',
  megaDaViradaAccumulated: 'Acumulado Sorteio Especial Mega da Virada',
  observation: 'Observacao',
} as const;

function normalizeHeader(header: string) {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCurrency(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const normalized = text
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInteger(value: unknown): number {
  if (typeof value === 'number') return Math.trunc(value);
  const parsed = Number(String(value ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function parseDate(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function readValue(row: Record<string, unknown>, expectedHeader: string): unknown {
  const normalizedHeader = normalizeHeader(expectedHeader);
  const key = Object.keys(row).find((item) => normalizeHeader(item) === normalizedHeader);
  return key ? row[key] : undefined;
}

function parseRow(row: Record<string, unknown>): Draw | null {
  const concurso = parseInteger(readValue(row, HEADER.concurso));
  const numbers = Array.from({ length: 6 }, (_, index) =>
    parseInteger(readValue(row, `Bola${index + 1}`)),
  ).filter((n) => n >= 1 && n <= 60);

  if (!concurso || numbers.length !== 6) return null;

  return {
    id: String(concurso),
    concurso,
    date: parseDate(readValue(row, HEADER.date)),
    numbers: numbers.sort((a, b) => a - b),
    winners6: parseInteger(readValue(row, HEADER.winners6)),
    cityUf: String(readValue(row, HEADER.cityUf) ?? '').trim(),
    prize6: parseCurrency(readValue(row, HEADER.prize6)),
    winners5: parseInteger(readValue(row, HEADER.winners5)),
    prize5: parseCurrency(readValue(row, HEADER.prize5)),
    winners4: parseInteger(readValue(row, HEADER.winners4)),
    prize4: parseCurrency(readValue(row, HEADER.prize4)),
    accumulated6: parseCurrency(readValue(row, HEADER.accumulated6)),
    totalRevenue: parseCurrency(readValue(row, HEADER.totalRevenue)),
    estimatedPrize: parseCurrency(readValue(row, HEADER.estimatedPrize)),
    megaDaViradaAccumulated: parseCurrency(readValue(row, HEADER.megaDaViradaAccumulated)),
    observation: String(readValue(row, HEADER.observation) ?? '').trim(),
  };
}

function readLocalDraws(): Draw[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(LOCAL_DRAWS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Draw[];
    return parsed
      .map((draw) => ({
        ...draw,
        numbers: (draw.numbers || []).map((n) => Number(n)).sort((a, b) => a - b),
      }))
      .sort((a, b) => a.concurso - b.concurso);
  } catch {
    return [];
  }
}

function writeLocalDraws(draws: Draw[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_DRAWS_KEY, JSON.stringify(draws));
}

function mergeDrawSets(existing: Draw[], incoming: Draw[]) {
  const merged = new Map(existing.map((item) => [item.id, item]));
  let created = 0;
  let updated = 0;

  for (const draw of incoming) {
    if (merged.has(draw.id)) updated += 1;
    else created += 1;
    merged.set(draw.id, draw);
  }

  return {
    draws: [...merged.values()].sort((a, b) => a.concurso - b.concurso),
    created,
    updated,
  };
}

export async function parseDrawsWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const parsedRows = rawRows.map(parseRow);
  const draws = parsedRows.filter((item): item is Draw => Boolean(item));
  const skipped = parsedRows.length - draws.length;

  return { draws, skipped };
}

export async function fetchAllDraws(): Promise<Draw[]> {
  if (!db) return readLocalDraws();

  const snapshot = await getDocs(query(collection(db, 'draws'), orderBy('concurso', 'asc')));
  return snapshot.docs.map((item) => {
    const data = item.data() as Draw;
    return {
      ...data,
      id: item.id,
      numbers: (data.numbers || []).map((n) => Number(n)).sort((a, b) => a - b),
    };
  });
}

export async function importDrawsWorkbook(file: File): Promise<ImportSummary> {
  const { draws, skipped } = await parseDrawsWorkbook(file);

  if (!db) {
    const existing = readLocalDraws();
    const merged = mergeDrawSets(existing, draws);
    writeLocalDraws(merged.draws);
    return {
      processed: draws.length,
      created: merged.created,
      updated: merged.updated,
      skipped,
    };
  }

  const drawsCollection = collection(db, 'draws');
  const existingSnapshot = await getDocs(drawsCollection);
  const existingIds = new Set(existingSnapshot.docs.map((item) => item.id));

  let created = 0;
  let updated = 0;
  let currentBatch = writeBatch(db);
  let opsInBatch = 0;

  for (const draw of draws) {
    const ref = doc(drawsCollection, draw.id);
    const alreadyExists = existingIds.has(draw.id);

    currentBatch.set(
      ref,
      {
        ...draw,
        updatedAt: serverTimestamp(),
        ...(alreadyExists ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    if (alreadyExists) updated += 1;
    else created += 1;

    opsInBatch += 1;
    if (opsInBatch >= 400) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await currentBatch.commit();
  }

  await addDoc(collection(db, 'imports'), {
    source: 'xlsx',
    fileName: file.name,
    processed: draws.length,
    created,
    updated,
    skipped,
    createdAt: serverTimestamp(),
  });

  return {
    processed: draws.length,
    created,
    updated,
    skipped,
  };
}
