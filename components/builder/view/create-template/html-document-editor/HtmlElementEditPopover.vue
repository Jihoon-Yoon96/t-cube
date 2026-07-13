<template>
  <div
    class="html-link-edit-popover"
    :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
    @click.stop
    @keydown.esc.stop.prevent="emit('close')"
  >
    <template v-if="menu.mode === 'menu'">
      <button
        v-if="menu.targetType === 'link' || menu.targetType === 'text' || menu.hasLink"
        type="button"
        @click.stop="emit('edit-href')"
      >
        <TcubeIcon icon="ri-link" />
        <span>링크 수정</span>
      </button>
      <button v-if="menu.targetType === 'text'" type="button" @click.stop="emit('edit-text')">
        <TcubeIcon icon="ri-text" />
        <span>텍스트 수정</span>
      </button>
      <button
        v-if="menu.targetType === 'image' || menu.targetType === 'picture' || menu.targetType === 'video'"
        type="button"
        @click.stop="emit('edit-media')"
      >
        <TcubeIcon icon="ri-edit-box-line" />
        <span>{{ menu.targetType === 'video' ? '비디오 수정' : '이미지 수정' }}</span>
      </button>
    </template>

    <template v-else-if="menu.mode === 'href'">
      <label>
        <span>링크 주소</span>
        <input
          :value="menu.href"
          type="text"
          placeholder="https://..."
          @input="handleHrefInput"
          @keydown.enter.prevent="emit('apply-href')"
          @keydown.esc.prevent="emit('close')"
        >
      </label>
      <div class="html-link-edit-actions">
        <button type="button" @click.stop="emit('close')">취소</button>
        <button type="button" @click.stop="emit('apply-href')">적용</button>
      </div>
    </template>

    <template v-else-if="menu.mode === 'media-src'">
      <div v-for="mediaSource in menu.mediaSources" :key="mediaSource.selector" class="html-media-source-field">
        <label>
          <span>{{ mediaSource.label }}<template v-if="mediaSource.media"> · {{ mediaSource.media }}</template><template v-else-if="mediaSource.mimeType"> · {{ mediaSource.mimeType }}</template></span>
          <input
            :value="mediaSource.src"
            class="html-media-source-input"
            type="text"
            placeholder="https://..."
            @input="handleMediaSourceInput(mediaSource.selector, $event)"
            @keydown.enter.prevent="emit('apply-media')"
            @keydown.esc.prevent="emit('close')"
          >
        </label>
        <button
          type="button"
          :aria-label="menu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드'"
          :title="menu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드'"
          @click.stop="emit('pick-media', mediaSource.selector)"
        >
          <TcubeIcon icon="ri-upload-cloud-2-line" />
          <span>{{ menu.targetType === 'video' ? '비디오 업로드' : '이미지 업로드' }}</span>
        </button>
      </div>
      <div class="html-link-edit-actions">
        <button type="button" @click.stop="emit('close')">취소</button>
        <button type="button" @click.stop="emit('apply-media')">적용</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { HtmlElementEditPopoverState } from '~/types/builder/html-document-editor'

defineProps<{
  menu: HtmlElementEditPopoverState
}>()

const emit = defineEmits<{
  'close': []
  'edit-href': []
  'edit-text': []
  'edit-media': []
  'apply-href': []
  'apply-media': []
  'pick-media': [mediaSourceSelector: string]
  'update-href': [href: string]
  'update-media-source': [mediaSourceSelector: string, src: string]
}>()

/**
 * 링크 주소 입력값 전달
 *
 * @param event 링크 주소 input 이벤트
 * @returns 없음
 */
function handleHrefInput(event: Event) {
  emit('update-href', (event.target as HTMLInputElement).value)
}

/**
 * 미디어 source 주소 입력값 전달
 *
 * @param mediaSourceSelector 수정할 미디어 source selector
 * @param event source 주소 input 이벤트
 * @returns 없음
 */
function handleMediaSourceInput(mediaSourceSelector: string, event: Event) {
  emit('update-media-source', mediaSourceSelector, (event.target as HTMLInputElement).value)
}
</script>
