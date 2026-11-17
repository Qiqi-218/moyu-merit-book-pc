import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@shared': resolve(__dirname, 'src/shared'),
            '@': resolve(__dirname, 'src/renderer/src')
        }
    },
    test: {
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        environment: 'node',
        environmentMatchGlobs: [['src/renderer/**', 'happy-dom']],
        globals: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary'],
            include: ['src/main/domain/**/*.ts', 'src/shared/**/*.ts', 'src/main/store/**/*.ts'],
            exclude: ['src/**/__tests__/**']
        }
    }
})