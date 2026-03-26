import { ElectronAPI } from '../renderer/src/types/electron-api'

declare global {
  interface Window {
    api: ElectronAPI
  }
}
