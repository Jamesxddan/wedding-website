export function albumPriority(name: string): number {
  const lower = name.toLowerCase();
  if (lower === "main") return 0;
  const subMatch = lower.match(/^sub(\d+)$/);
  if (subMatch) return parseInt(subMatch[1], 10);
  if (lower === "sub") return 1;
  return 50;
}
