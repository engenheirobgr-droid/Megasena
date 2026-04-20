import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  limit,
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

const SHEET_PATH = 'xl/worksheets/sheet1.xml';
const SHARED_STRINGS_PATH = 'xl/sharedStrings.xml';

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

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r');
}

function getWorkbookFileText(workbook: XLSX.WorkBook, path: string): string {
  const files = (workbook as XLSX.WorkBook & { files?: Record<string, { content?: unknown }> }).files;
  const file = files?.[path];
  const content = file?.content;
  if (!content) return '';

  if (typeof content === 'string') return content;
  if (content instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(content));
  if (content instanceof Uint8Array) return new TextDecoder().decode(content);
  if (Array.isArray(content)) return new TextDecoder().decode(new Uint8Array(content));

  return '';
}

function lettersToColumnIndex(letters: string): number {
  let result = 0;
  for (const char of letters.toUpperCase()) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result - 1;
}

function parseSharedStrings(xml: string): string[] {
  const siNodes = xml.match(/<si[\s\S]*?<\/si>/g) || [];
  return siNodes.map((node) => {
    const parts = [...node.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXmlEntities(m[1]));
    return parts.join('');
  });
}

function parseSheetRowsFromXml(sheetXml: string, sharedStrings: string[]): Record<string, unknown>[] {
  const rowNodes = sheetXml.match(/<(?:x:)?row\b[\s\S]*?<\/(?:x:)?row>/g) || [];
  if (!rowNodes.length) return [];

  let headersByColumn = new Map<number, string>();
  const rows: Record<string, unknown>[] = [];

  rowNodes.forEach((rowNode, rowIndex) => {
    const cellNodes = rowNode.match(/<(?:x:)?c\b[\s\S]*?(?:\/>|<\/(?:x:)?c>)/g) || [];
    const columns = new Map<number, unknown>();
    let fallbackColIndex = 0;

    for (const cell of cellNodes) {
      const refMatch = cell.match(/\br="([A-Z]+)\d+"/);
      const colIndex = refMatch ? lettersToColumnIndex(refMatch[1]) : fallbackColIndex;
      fallbackColIndex = colIndex + 1;
      const typeMatch = cell.match(/\bt="([^"]+)"/);
      const type = typeMatch?.[1] || '';

      const valueMatch = cell.match(/<(?:x:)?v>([\s\S]*?)<\/(?:x:)?v>/);
      const inlineMatch = cell.match(/<(?:x:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:x:)?t>/);
      const rawValue = valueMatch?.[1] ?? inlineMatch?.[1] ?? '';

      let value: unknown = decodeXmlEntities(rawValue);
      if (type === 's') {
        value = sharedStrings[Number(rawValue)] ?? '';
      }

      columns.set(colIndex, value);
    }

    if (!columns.size) return;

    if (rowIndex === 0) {
      headersByColumn = new Map<number, string>();
      columns.forEach((value, colIndex) => {
        headersByColumn.set(colIndex, String(value || '').trim());
      });
      return;
    }

    const row: Record<string, unknown> = {};
    headersByColumn.forEach((header, colIndex) => {
      row[header] = columns.has(colIndex) ? columns.get(colIndex) : '';
    });
    rows.push(row);
  });

  return rows;
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
  const workbook = XLSX.read(buffer, { type: 'array', bookFiles: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  let rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  // Some Caixa workbooks come with a broken dimension (e.g. A1:T1). Fallback to raw XML parsing.
  if (!rawRows.length) {
    const sheetXml = getWorkbookFileText(workbook, SHEET_PATH);
    const sharedStringsXml = getWorkbookFileText(workbook, SHARED_STRINGS_PATH);
    const sharedStrings = parseSharedStrings(sharedStringsXml);
    rawRows = parseSheetRowsFromXml(sheetXml, sharedStrings);
  }

  const parsedRows = rawRows.map(parseRow);
  const draws = parsedRows.filter((item): item is Draw => Boolean(item));
  const skipped = parsedRows.length - draws.length;

  if (!draws.length) {
    throw new Error('Nenhum concurso válido encontrado no XLSX. Verifique o arquivo e tente novamente.');
  }

  return { draws, skipped };
}

export async function fetchAllDraws(): Promise<Draw[]> {
  if (!db) return readLocalDraws();

  // getDocsFromServer garante dados frescos do servidor, ignorando cache local
  const snapshot = await getDocsFromServer(query(collection(db, 'draws'), orderBy('concurso', 'asc')));
  return snapshot.docs.map((item) => {
    const data = item.data() as Draw;
    return {
      ...data,
      id: item.id,
      numbers: (data.numbers || []).map((n) => Number(n)).sort((a, b) => a - b),
    };
  });
}

export type LastSync = {
  date: Date;
  created: number;
  updated: number;
  processed: number;
  fileName: string;
};

export async function fetchLastSync(): Promise<LastSync | null> {
  if (!db) return null;
  try {
    const snapshot = await getDocs(
      query(collection(db, 'imports'), orderBy('createdAt', 'desc'), limit(1)),
    );
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return {
      date: data.createdAt?.toDate?.() ?? new Date(),
      created: data.created ?? 0,
      updated: data.updated ?? 0,
      processed: data.processed ?? 0,
      fileName: data.fileName ?? '',
    };
  } catch {
    return null;
  }
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
