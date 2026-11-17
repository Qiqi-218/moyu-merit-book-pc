import type { DataDocument } from '@shared/types/models'

export interface Migration {
    to: number
    description: string
    run(doc: DataDocument): DataDocument
}

export const MIGRATIONS: Migration[] = []