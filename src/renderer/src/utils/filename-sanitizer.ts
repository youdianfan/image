// Windows illegal filename characters
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g

// Windows reserved names
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
])

export function sanitizeFilename(name: string): string {
  let result = name

  // Remove illegal characters
  result = result.replace(ILLEGAL_CHARS, '')

  // Replace consecutive whitespace/hyphens/underscores with single separator
  result = result.replace(/[\s_-]{2,}/g, (m) => m[0])

  // Trim leading/trailing dots, spaces, hyphens
  result = result.replace(/^[.\s-]+|[.\s-]+$/g, '')

  // Handle Windows reserved names
  const nameWithoutExt = result.replace(/\.[^.]+$/, '')
  if (RESERVED_NAMES.has(nameWithoutExt.toUpperCase())) {
    result = `_${result}`
  }

  return result
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(36).substring(0, 6)
}

export function truncateFilename(name: string, maxLength = 200): string {
  const dotIndex = name.lastIndexOf('.')
  const hasExt = dotIndex > 0
  const baseName = hasExt ? name.substring(0, dotIndex) : name
  const ext = hasExt ? name.substring(dotIndex) : ''

  const maxBase = maxLength - ext.length

  if (baseName.length <= maxBase) {
    return name
  }

  const hash = simpleHash(baseName)
  const truncated = baseName.substring(0, maxBase - 7) // 7 = '-' + 6 hash chars
  return `${truncated}-${hash}${ext}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
