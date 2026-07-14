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

    <div class="html-editor-chat-target" :class="{ 'is-empty': !selectedLayoutNode }">
      <span>수정 대상</span>
      <strong>{{ selectedLayoutNode?.label || '구조에서 노드를 선택해주세요' }}</strong>
      <p v-if="isLargeTarget">
        선택한 노드의 범위가 큽니다. 포함된 HTML이 많을수록 작업 시간이 길어지고 AI 토큰 사용량이 증가할 수 있습니다.
      </p>
    </div>

    <div ref="messageList" class="html-editor-chat-messages" aria-live="polite">
      <div v-if="messages.length === 0" class="html-editor-chat-empty">
        <TcubeIcon icon="ri-sparkling-2-line" />
        <strong>{{ selectedLayoutNode ? '선택한 노드의 수정 내용을 입력해주세요' : '먼저 구조에서 수정할 노드를 선택해주세요' }}</strong>
        <p v-if="selectedLayoutNode">예: 배경색을 밝은 보라색으로 변경해줘</p>
        <p v-if="selectedLayoutNode">예: 제목 아래에 설명 문구를 추가해줘</p>
      </div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="html-editor-chat-message"
        :class="`is-${message.role}`"
      >
        <span>{{ message.role === 'user' ? '나' : 'AI' }}</span>
        <small v-if="message.role === 'user' && message.targetLabel">
          <TcubeIcon icon="ri-node-tree" />
          {{ message.targetLabel }}
        </small>
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
        :placeholder="selectedLayoutNode ? '선택한 노드의 수정 내용을 입력하세요' : '구조 노드 선택 필요'"
        aria-label="HTML 수정 요청"
        :disabled="isRequesting || !selectedLayoutNode"
        @compositionstart="isComposing = true"
        @compositionend="handleCompositionEnd"
        @keydown.enter.exact="handleComposerEnter"
      />
      <button
        class="html-editor-chat-action"
        :class="{ 'is-stop': isRequesting }"
        type="button"
        :disabled="!isRequesting && (!selectedLayoutNode || !draft.trim())"
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
import type { ParsedHtmlLayoutNode } from '~/services/html/parseHtmlDocument'

const LARGE_TARGET_OUTER_HTML_LENGTH = 30_000

const props = defineProps<{
  selectedLayoutNode: ParsedHtmlLayoutNode | null
  selectedOuterHtmlLength: number
}>()

const emit = defineEmits<{
  'close': []
  'applied': [layoutNodeId: string]
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
const isComposing = ref(false)
const submitAfterComposition = ref(false)

/** 선택 노드 크기 안내 표시 여부 */
const isLargeTarget = computed(() => props.selectedOuterHtmlLength >= LARGE_TARGET_OUTER_HTML_LENGTH)

/**
 * Enter 입력 시 한글 조합 상태를 고려한 전송 처리
 *
 * @param event textarea 키보드 이벤트
 * @returns 없음
 */
function handleComposerEnter(event: KeyboardEvent) {
  if (isComposing.value || event.isComposing || event.keyCode === 229) {
    submitAfterComposition.value = true
    return
  }

  event.preventDefault()
  handleSubmit()
}

/** 한글 조합 종료와 v-model 갱신 이후 대기 중인 메시지 전송 */
function handleCompositionEnd() {
  isComposing.value = false

  if (!submitAfterComposition.value) return

  submitAfterComposition.value = false
  nextTick(() => handleSubmit())
}

/** 입력 중인 HTML 수정 요청 전송 */
async function handleSubmit() {
  const content = draft.value.trim()

  if (!content || !props.selectedLayoutNode || isRequesting.value) return

  const targetLayoutNode = props.selectedLayoutNode
  draft.value = ''
  const appliedLayoutNodeId = await sendMessage(content, targetLayoutNode)

  if (appliedLayoutNodeId) emit('applied', appliedLayoutNodeId)
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
