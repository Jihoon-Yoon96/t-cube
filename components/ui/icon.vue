<template>
  <i
    :class="icon"
    :style="iconStyle"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon: string
    size?: number | string
    color?: string
  }>(),
  {
    size: undefined,
    color: undefined
  }
)

const iconStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.size !== undefined) {
    style.fontSize = typeof props.size === 'number' ? `${props.size}px` : props.size
  }

  if (props.color) {
    style.color = props.color
  }

  return style
})
</script>

<style scoped>
i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  font-style: normal;
  line-height: 1;
}
</style>
