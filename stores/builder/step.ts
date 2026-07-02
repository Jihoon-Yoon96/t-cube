/**
 * 빌더의 현재 화면 위치와 미리보기 viewport 상태를 관리
 */


import type { BuilderStep, BuilderViewportMode } from './type/types'

export function useBuilderStepState() {
  const step = ref<BuilderStep>('start')
  const activeViewport = ref<BuilderViewportMode>('desktop')

  function setStep(nextStep: BuilderStep) {
    step.value = nextStep
  }

  function setActiveViewport(nextViewport: BuilderViewportMode) {
    activeViewport.value = nextViewport
  }

  function startEditor() {
    step.value = 'editor'
  }

  return {
    step,
    activeViewport,
    setStep,
    setActiveViewport,
    startEditor
  }
}
