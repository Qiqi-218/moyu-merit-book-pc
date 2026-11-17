import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
    {
        ignores: [
            'out/**',
            'release/**',
            'node_modules/**',
            'dist/**',
            'build/**',
            '.codeartsdoer/**',
            'coverage/**'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: { parser: tseslint.parser }
        }
    },
    {
        rules: {
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
            ],
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'off'
        }
    },
    {
        files: ['src/main/domain/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        { name: 'electron', message: 'domain 层不得依赖 Electron' },
                        { name: 'fs', message: 'domain 层必须是纯函数' },
                        { name: 'node:fs', message: 'domain 层必须是纯函数' },
                        { name: 'vue', message: 'domain 层不得依赖 Vue' }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/shared/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        { name: 'electron', message: 'shared 层是双端契约，不得依赖 Electron' },
                        { name: 'vue', message: 'shared 层不得依赖 Vue' }
                    ],
                    patterns: [
                        { group: ['../main/*', '../renderer/*'], message: 'shared 层不得反向依赖主进程或渲染层' }
                    ]
                }
            ]
        }
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', __dirname: 'readonly' }
        }
    }
)