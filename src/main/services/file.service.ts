import { dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export interface FileInfo {
  name: string
  path: string
  size: number
  extension: string
  isDirectory: boolean
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'])

export class FileService {
  async selectFiles(): Promise<FileInfo[]> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: [...IMAGE_EXTENSIONS] }
      ]
    })
    if (result.canceled) return []
    return Promise.all(result.filePaths.map((p) => this.getFileInfo(p)))
  }

  async selectFolder(): Promise<FileInfo[]> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return []
    return this.scanDirectory(result.filePaths[0])
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    const stat = await fs.stat(filePath)
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      extension: path.extname(filePath).toLowerCase().slice(1),
      isDirectory: stat.isDirectory()
    }
  }

  async scanDirectory(dirPath: string, recursive = false): Promise<FileInfo[]> {
    const files: FileInfo[] = []
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase().slice(1)
        if (IMAGE_EXTENSIONS.has(ext)) {
          files.push(await this.getFileInfo(fullPath))
        }
      } else if (entry.isDirectory() && recursive) {
        const subFiles = await this.scanDirectory(fullPath, true)
        files.push(...subFiles)
      }
    }

    return files
  }
}

export const fileService = new FileService()
