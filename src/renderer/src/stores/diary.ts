import { defineStore } from 'pinia'
import type { DiaryMonthView, DiaryView } from '@shared/types/dto'
import { call } from '@/api'
import { useUiStore } from './ui'

const initial = new Date()

export const useDiaryStore = defineStore('diary', {
    state: () => ({
        year: initial.getFullYear(),
        month: initial.getMonth() + 1,
        monthView: null as DiaryMonthView | null,
        selectedDate: '',
        dayDiaries: [] as DiaryView[],
        loading: false
    }),
    actions: {
        async loadMonth(year?: number, month?: number): Promise<void> {
            const targetYear = year ?? this.year
            const targetMonth = month ?? this.month
            this.year = targetYear
            this.month = targetMonth
            this.loading = true
            try {
                const result = await call(window.moyu.diary.listMonth({ year: targetYear, month: targetMonth }), true)
                if (result) this.monthView = result
            } finally {
                this.loading = false
            }
        },
        async selectDate(date: string): Promise<void> {
            this.selectedDate = date
            await this.loadDate(date)
        },
        async loadDate(date: string): Promise<void> {
            const result = await call(window.moyu.diary.listDate(date), true)
            if (result) this.dayDiaries = result
        },
        async remove(id: string): Promise<boolean> {
            const result = await call(window.moyu.diary.remove(id, true))
            if (!result) return false
            useUiStore().pushToast('手记已删除', '相关联的功德已按日重算。', 'success')
            await this.loadMonth()
            if (this.selectedDate) await this.loadDate(this.selectedDate)
            return true
        }
    }
})