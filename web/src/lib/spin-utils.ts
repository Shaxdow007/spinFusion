import type { SpinEntry } from './spin-types';


export function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xFFFFFFFF + 1);
}


export function pickWeightedWinner(entries: SpinEntry[]): SpinEntry {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let rand = secureRandom() * total;
  for (const entry of entries) {
    rand -= entry.weight;
    if (rand <= 0) return entry;
  }
  return entries[entries.length - 1];
}


export function computeFinalAngle(
  entries: SpinEntry[],
  winner: SpinEntry,
  currentAngle: number
): number {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  let cumAngle = 0;
  for (const entry of entries) {
    const slice = (entry.weight / totalWeight) * Math.PI * 2;
    if (entry.id === winner.id) {
      const winnerMid = cumAngle + slice / 2;
      const spins = 5 + Math.floor(secureRandom() * 5);
      const totalRot = spins * Math.PI * 2;
      const currentNorm = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const needed = ((Math.PI * 2 * 2 - winnerMid) % (Math.PI * 2));
      const diff = ((needed - currentNorm) + Math.PI * 2) % (Math.PI * 2);
      return currentAngle + totalRot + diff;
    }
    cumAngle += slice;
  }
  return currentAngle + Math.PI * 12;
}


export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}


export function computeFontSize(entryCount: number): number {
  if (entryCount <= 4) return 22;
  if (entryCount <= 8) return 17;
  if (entryCount <= 15) return 13;
  if (entryCount <= 25) return 10;
  return 8;
}


export function assignColors(texts: string[], colors: string[]): SpinEntry[] {
  return texts.map((text, i) => ({
    id: Date.now() + i,
    text,
    weight: 1,
    color: colors[i % colors.length],
  }));
}

