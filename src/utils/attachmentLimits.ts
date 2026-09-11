export interface AttachmentCapResult {
  accepted: File[];
  oversized: File[];
  unsupported: File[];
  skippedForLimit: number;
}

export function capAttachmentSelection(
  candidates: File[],
  existingCount: number,
  maxCount: number,
  maxSizeMB: number,
  isAllowedType?: (file: File) => boolean,
): AttachmentCapResult {
  const accepted: File[] = [];
  const oversized: File[] = [];
  const unsupported: File[] = [];
  let remaining = Math.max(0, maxCount - existingCount);

  for (const file of candidates) {
    if (isAllowedType && !isAllowedType(file)) {
      unsupported.push(file);
      continue;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      oversized.push(file);
      continue;
    }
    if (remaining <= 0) continue;
    accepted.push(file);
    remaining--;
  }

  const skippedForLimit =
    candidates.length - accepted.length - oversized.length - unsupported.length;

  return { accepted, oversized, unsupported, skippedForLimit };
}

export function capFilesByCount(
  candidates: File[],
  existingCount: number,
  maxCount: number,
): { accepted: File[]; skippedForLimit: number } {
  const remaining = Math.max(0, maxCount - existingCount);
  const accepted = candidates.slice(0, remaining);
  return { accepted, skippedForLimit: candidates.length - accepted.length };
}
