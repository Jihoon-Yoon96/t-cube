/**
 * 템플릿 생성 단계 중 "디자인 시안 작성" 흐름에서
 * 사용자가 선택한 작성 방식과 AI 생성 상태를 관리
 */


import type { BuilderDesignMethod, BuilderStep } from './type/types'

export function useBuilderDesignState(step: Ref<BuilderStep>) {
  const selectedDesignMethod = ref<BuilderDesignMethod | null>(null)
  const aiStatus = ref<'idle' | 'generating' | 'complete' | 'error'>('idle')

  function selectDesignMethod(method: BuilderDesignMethod) {
    selectedDesignMethod.value = method
    step.value = 'ai-design'
  }

  return {
    selectedDesignMethod,
    aiStatus,
    selectDesignMethod
  }
}
