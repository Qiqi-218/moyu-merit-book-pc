import { defineStore } from 'pinia'
import type { EventDetail, EventSort } from '@shared/types/dto'
import type { EventKind, EventStatus, Tag } from '@shared/types/models'
import { call } from '@/api'

export interface EventsQuery {
    kind: EventKind
    status?: EventStatus
    tagId?: string
    sort: EventSort
    keyword: string
    page: number
    pageSize: number
}

export const useEventsStore = defineStore('events', {
    state: () => ({
        items: [] as EventDetail[],
        total: 0,
        countsByKind: { todo: 0, habit: 0, principle: 0 } as Record<EventKind, number>,
        countsByStatus: { active: 0, paused: 0, ended: 0 } as Record<EventStatus, number>,
        tags: [] as Tag[],
        loading: false,
        query: {
            kind: 'todo',
            sort: 'recent',
            keyword: '',
            page: 1,
            pageSize: 100
        } as EventsQuery
    }),
    getters: {
        activeTagName: (state) => (tagId?: string): string => {
            if (!tagId) return ''
            return state.tags.find((item) => item.id === tagId)?.name ?? ''
        }
    },
    actions: {
        async load(patch?: Partial<EventsQuery>): Promise<void> {
            if (patch) Object.assign(this.query, patch)
            this.loading = true
            try {
                const result = await call(window.moyu.events.list(this.query), true)
                if (result) {
                    this.items = result.items
                    this.total = result.total
                    this.countsByKind = result.countsByKind
                    this.countsByStatus = result.countsByStatus
                }
            } finally {
                this.loading = false
            }
        },
        async loadTags(): Promise<void> {
            const result = await call(window.moyu.tags.list(), true)
            if (result) this.tags = result
        },
        async setKind(kind: EventKind): Promise<void> {
            await this.load({ kind, status: undefined, tagId: undefined })
        },
        async setStatus(status?: EventStatus): Promise<void> {
            await this.load({ status })
        },
        async setTag(tagId?: string): Promise<void> {
            await this.load({ tagId })
        },
        async setSort(sort: EventSort): Promise<void> {
            await this.load({ sort })
        },
        async setKeyword(keyword: string): Promise<void> {
            await this.load({ keyword })
        }
    }
})