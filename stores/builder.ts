/**
 * 빌더 전체 Pinia store를 조립하는 진입점입니다.
 * 각 도메인별 상태 모듈을 합쳐 외부 컴포넌트에는 단일 store API를 제공합니다.
 */
import { useBuilderDesignState } from './builder/design'
import { useBuilderEditorState } from './builder/editor'
import { useBuilderStepState } from './builder/step'
import { useBuilderUploadState } from './builder/upload'

export type {
  BuilderDesignMethod,
  BuilderStep,
  BuilderUploadedFileSummary,
  BuilderUploadFileType,
  BuilderViewportMode
} from './builder/type/types'

export const useBuilderStore = defineStore('builder', () => {
  const stepState = useBuilderStepState()
  const uploadState = useBuilderUploadState(stepState.step)
  const designState = useBuilderDesignState(stepState.step)
  const editorState = useBuilderEditorState()

  return {
    ...stepState,
    ...uploadState,
    ...designState,
    ...editorState
  }
})
