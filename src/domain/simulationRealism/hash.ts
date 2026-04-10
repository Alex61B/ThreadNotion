export function hashStringToNonNegativeInt(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function hashStringToIndex(input: string, modulo: number): number {
  if (modulo <= 0) return 0;
  return hashStringToNonNegativeInt(input) % modulo;
}

