import { contextBridge } from 'electron'
import { api, applyEarlyTheme } from './api'

applyEarlyTheme()
contextBridge.exposeInMainWorld('moyu', api)