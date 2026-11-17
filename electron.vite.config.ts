import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const sharedAlias = {
    '@shared': resolve(__dirname, 'src/shared')
}

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        resolve: { alias: sharedAlias },
        build: { outDir: 'out/main', sourcemap: false }
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        resolve: { alias: sharedAlias },
        build: { outDir: 'out/preload', sourcemap: false }
    },
    renderer: {
        root: 'src/renderer',
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src/renderer/src'),
                '@shared': resolve(__dirname, 'src/shared')
            }
        },
        plugins: [vue()],
        build: {
            outDir: 'out/renderer',
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html'),
                    mini: resolve(__dirname, 'src/renderer/mini-timer.html')
                }
            }
        }
    }
})