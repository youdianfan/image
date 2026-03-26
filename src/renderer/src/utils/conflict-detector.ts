import type { ConflictStrategy } from "@/stores/workspace.store";

export interface ConflictItem {
  id: string;
  originalPath: string;
  intendedName: string;
  resolvedName: string;
  hasConflict: boolean;
}

function insertBeforeExtension(filename: string, suffix: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) return `${filename}${suffix}`;
  return `${filename.substring(0, dotIndex)}${suffix}${filename.substring(dotIndex)}`;
}

export function detectAndResolveConflicts(
  items: Array<{ id: string; path: string; newName: string }>,
  strategy: ConflictStrategy,
): ConflictItem[] {
  // Group by target name (case-insensitive for Windows)
  const nameGroups = new Map<string, number[]>();
  const results: ConflictItem[] = items.map((item) => ({
    id: item.id,
    originalPath: item.path,
    intendedName: item.newName,
    resolvedName: item.newName,
    hasConflict: false,
  }));

  items.forEach((item, index) => {
    const key = item.newName.toLowerCase();
    const group = nameGroups.get(key);
    if (group) {
      group.push(index);
    } else {
      nameGroups.set(key, [index]);
    }
  });

  for (const [, indices] of nameGroups) {
    if (indices.length <= 1) continue;

    // Mark all duplicates
    for (let i = 1; i < indices.length; i++) {
      results[indices[i]].hasConflict = true;
    }

    if (strategy === "autoNumber") {
      // Also track names already used to avoid collisions with auto-numbered names
      const usedNames = new Set<string>(
        items.map((item) => item.newName.toLowerCase()),
      );

      for (let i = 1; i < indices.length; i++) {
        const idx = indices[i];
        const baseName = results[idx].intendedName;
        let counter = 1;
        let candidate: string;

        do {
          candidate = insertBeforeExtension(baseName, `-${counter}`);
          counter++;
        } while (usedNames.has(candidate.toLowerCase()));

        usedNames.add(candidate.toLowerCase());
        results[idx].resolvedName = candidate;
      }
    } else if (strategy === "skip") {
      // Skip duplicates (keep first, mark rest as skip)
      for (let i = 1; i < indices.length; i++) {
        results[indices[i]].resolvedName = "";
      }
    }
    // 'overwrite': keep same name, hasConflict flag is still set for UI warning
  }

  return results;
}
