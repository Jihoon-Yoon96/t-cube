<template>
  <section class="template-list-screen">
    <div class="template-list-header">
      <span class="section-title">SAVED TEMPLATES</span>
      <h1>수정할 템플릿을 선택해주세요</h1>
    </div>

    <div class="template-grid">
      <article
        v-for="template in savedTemplates"
        :key="template.id"
        class="template-card"
      >
        <div class="template-preview">
          <span :class="['template-badge', template.badgeClass]">{{ template.badge }}</span>
          <TcubeIcon :icon="template.icon" />
        </div>

        <div class="template-info">
          <strong>{{ template.name }}</strong>
          <span>{{ template.description }}</span>
        </div>

        <div class="template-meta">
          <span>{{ template.size }}</span>
          <span>{{ template.updatedAt }}</span>
        </div>

        <button class="template-action" type="button">
          <TcubeIcon icon="ri-edit-line" />
          <span>수정하기</span>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const savedTemplates = [
  {
    id: 'template-summer-sale',
    name: '여름 프로모션 배너',
    description: '메인 랜딩 상단에 사용하는 시즌 프로모션 템플릿',
    size: 'PC / Mobile',
    updatedAt: '2026.07.01',
    badge: 'Banner',
    badgeClass: 'purple',
    icon: 'ri-layout-top-line'
  },
  {
    id: 'template-event-bridge',
    name: '이벤트 브릿지 페이지',
    description: '캠페인 안내와 CTA 영역이 포함된 브릿지 페이지',
    size: 'PC',
    updatedAt: '2026.06.28',
    badge: 'Page',
    badgeClass: 'green',
    icon: 'ri-pages-line'
  },
  {
    id: 'template-product-card',
    name: '상품 소개 카드',
    description: '상품 이미지와 핵심 문구를 강조하는 카드형 템플릿',
    size: 'Tablet / Mobile',
    updatedAt: '2026.06.20',
    badge: 'Card',
    badgeClass: 'orange',
    icon: 'ri-bank-card-line'
  },
  {
    id: 'template-newsletter',
    name: '뉴스레터 파셜 HTML',
    description: 'CMS 본문에 삽입 가능한 뉴스레터 섹션 템플릿',
    size: 'Responsive',
    updatedAt: '2026.06.14',
    badge: 'HTML',
    badgeClass: 'blue',
    icon: 'ri-html5-line'
  }
]
</script>
