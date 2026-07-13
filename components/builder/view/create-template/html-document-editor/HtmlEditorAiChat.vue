<template>
  <aside class="html-editor-panel html-editor-chat-panel">
    <div class="html-editor-panel-title html-editor-chat-title">
      <div>
        <TcubeIcon icon="ri-chat-ai-line" />
        <strong>AI HTML 편집</strong>
      </div>
      <button
        class="html-editor-chat-close"
        type="button"
        aria-label="AI 채팅 닫기"
        :disabled="isRequesting"
        @click="emit('close')"
      >
        <TcubeIcon icon="ri-close-line" />
      </button>
    </div>

    <div ref="messageList" class="html-editor-chat-messages" aria-live="polite">
      <div v-if="messages.length === 0" class="html-editor-chat-empty">
        <TcubeIcon icon="ri-sparkling-2-line" />
        <strong>HTML 수정 내용을 입력해주세요</strong>
        <p>예: 전체 폰트를 Noto Sans KR로 변경해줘</p>
        <p>예: footer 태그를 div 태그로 변경해줘</p>
      </div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="html-editor-chat-message"
        :class="`is-${message.role}`"
      >
        <span>{{ message.role === 'user' ? '나' : 'AI' }}</span>
        <p>{{ message.content }}</p>
      </article>

      <article v-if="isRequesting" class="html-editor-chat-message is-assistant is-pending">
        <span>AI</span>
        <p>HTML 소스를 확인하고 있습니다<span aria-hidden="true">...</span></p>
      </article>
    </div>

    <div class="html-editor-chat-composer">
      <p v-if="requestError" class="html-editor-chat-error" role="alert">
        {{ requestError }}
      </p>
      <textarea
        v-model="draft"
        maxlength="4000"
        placeholder="수정할 내용을 입력하세요"
        aria-label="HTML 수정 요청"
        :disabled="isRequesting"
        @keydown.enter.exact.prevent="handleSubmit"
      />
      <button
        class="html-editor-chat-action"
        :class="{ 'is-stop': isRequesting }"
        type="button"
        :disabled="!isRequesting && !draft.trim()"
        @click="handleAction"
      >
        <TcubeIcon :icon="isRequesting ? 'ri-stop-circle-line' : 'ri-send-plane-2-line'" />
        <span>{{ isRequesting ? '정지' : '보내기' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useHtmlEditChat } from '~/composables/editor/useHtmlEditChat'

const emit = defineEmits<{
  'close': []
}>()

const {
  messages,
  isRequesting,
  requestError,
  sendMessage,
  cancelRequest
} = useHtmlEditChat()
const messageList = ref<HTMLElement | null>(null)
const draft = ref('')

/** 입력 중인 HTML 수정 요청 전송 */
function handleSubmit() {
  const content = draft.value.trim()

  if (!content || isRequesting.value) return

  draft.value = ''
  sendMessage(content)
}

/** 요청 상태에 따라 전송 또는 진행 중인 AI 요청 취소 */
function handleAction() {
  if (isRequesting.value) {
    cancelRequest()
    return
  }

  handleSubmit()
}

/** 채팅 메시지 추가 시 가장 최근 메시지가 보이도록 목록 하단 이동 */
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (!messageList.value) return

      messageList.value.scrollTop = messageList.value.scrollHeight
    })
  }
)
</script>
