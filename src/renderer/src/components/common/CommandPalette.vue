<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SearchItem, SearchResult } from '@shared/types/dto'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const router = useRouter()
const keyword = ref('')
const results = ref<SearchResult>({ pages: [], events: [], diaries: [], actions: [] })
const active = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
let timer: number | null = null

const groups = computed(() =>
  [
    { key: 'pages', label: '页面', items: results.value.pages },
    { key: 'events', label: '修行事项', items: results.value.events },
    { key: 'diaries', label: '手记', items: results.value.diaries },
    { key: 'actions', label: '操作', items: results.value.actions }
  ].filter((group) => group.items.length > 0)
)

const flat = computed<SearchItem[]>(() => groups.value.flatMap((group) => group.items))

async function search(): Promise<void> {
  const result = await window.moyu.records.search(keyword.value)
  if (result.ok) results.value = result.data
  active.value = 0
}

function execute(item: SearchItem | undefined): void {
  if (!item) return
  if (item.action === 'export') {
    void (async () => {
      const result = await window.moyu.backup.exportJson()
      if (!result.ok) ui.pushToast(result.error.message, result.error.hint)
      else if (!result.data.canceled) ui.pushToast('已导出', result.data.path ?? '', 'success')
    })()
  }
  if (item.route) void router.push(item.route)
  ui.closeCommand()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = flat.value.length === 0 ? 0 : (active.value + 1) % flat.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = flat.value.length === 0 ? 0 : (active.value - 1 + flat.value.length) % flat.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    execute(flat.value[active.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    ui.closeCommand()
  }
}

watch(keyword, () => {
  if (timer !== null) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void search()
  }, 120)
})

onMounted(() => {
  void search()
  window.setTimeout(() => inputRef.value?.focus(), 0)
})

onUnmounted(() => {
  if (timer !== null) window.clearTimeout(timer)
})
</script>

<template>
  <div class="palette-overlay" @click.self="ui.closeCommand()">
    <div class="palette" role="dialog" aria-modal="true" aria-label="命令面板">
      <input
        ref="inputRef"
        v-model="keyword"
        class="palette__input"
        type="text"
        placeholder="搜索页面、事项、手记或操作…"
        aria-label="命令面板搜索"
        @keydown="onKeydown"
      />
      <div class="palette__list">
        <template v-for="group in groups" :key="group.key">
          <div class="palette__group">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="palette__item"
            :class="{ 'palette__item--active': flat[active]?.id === item.id }"
            @click="execute(item)"
            @mouseenter="active = flat.findIndex((entry) => entry.id === item.id)"
          >
            <span>{{ item.label }}</span>
            <span class="palette__hint">{{ item.hint }}</span>
          </button>
        </template>
        <div v-if="flat.length === 0" class="palette__empty">没有找到匹配的内容</div>
      </div>
      <div class="palette__foot">
        <span>↑↓ 选择</span>
        <span>Enter 执行</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-command);
  background: var(--overlay);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  padding-top: 12vh;
}

.palette {
  width: 560px;
  max-width: calc(100vw - 48px);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
  animation: fade-in var(--t-base) var(--ease);
}

.palette__input {
  height: 52px;
  padding: 0 var(--sp-4);
  border: none;
  border-bottom: 1px solid var(--line-soft);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--fs-body);
}

.palette__input:focus {
  outline: none;
}

.palette__input::placeholder {
  color: var(--placeholder);
}

.palette__list {
  overflow-y: auto;
  padding: var(--sp-2);
}

.palette__group {
  padding: 6px var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--muted-2);
  letter-spacing: 0.08em;
}

.palette__item {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-2);
  border-radius: 8px;
  color: var(--text-2);
  font-size: var(--fs-body);
  text-align: left;
}

.palette__item--active {
  background: var(--green-soft);
  color: var(--green-deep);
}

.palette__hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.palette__empty {
  padding: var(--sp-5);
  text-align: center;
  color: var(--muted);
  font-size: var(--fs-note);
}

.palette__foot {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-4);
  border-top: 1px solid var(--line-soft);
  font-size: var(--fs-micro);
  color: var(--muted-2);
}
</style>