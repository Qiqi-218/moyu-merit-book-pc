import type { DataDocument } from '@shared/types/models'
import { SCHEMA_VERSION } from '@shared/constants'
import { StoreError } from './errors'
import { MIGRATIONS } from './migrations'

export function migrate(doc: DataDocument): DataDocument {
    if (typeof doc.schemaVersion !== 'number') {
        throw new StoreError('E_SCHEMA', '缺少 schemaVersion')
    }
    if (doc.schemaVersion > SCHEMA_VERSION) {
        throw new StoreError('E_VERSION_TOO_NEW', '数据文件来自更高版本')
    }
    let current = doc
    let guard = 0
    while (current.schemaVersion < SCHEMA_VERSION) {
        guard += 1
        if (guard > 50) throw new StoreError('E_SCHEMA', '迁移链异常')
        const next = MIGRATIONS.find((item) => item.to === (current.schemaVersion ?? 0) + 1)
        if (!next) {
            throw new StoreError('E_SCHEMA', `缺少 v${current.schemaVersion} 到 v${(current.schemaVersion ?? 0) + 1} 的迁移`)
        }
        const migrated = next.run(current)
        current = { ...migrated, schemaVersion: next.to }
    }
    return current
}