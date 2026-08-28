import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ModoApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    modo: ModoApi
  }
}
