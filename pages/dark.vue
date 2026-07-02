<template>
	<div class="drive-page">
		<div class="drive-shell">
			<!-- Desktop Sidebar -->
			<aside class="sidebar desktop-sidebar">
				<div class="brand">
					<!--					<i class="ri-google-fill"></i>-->
					<i class="ri-edit-box-fill"></i>
					<div class="brand-text">
						<strong>T.CUBE</strong>
					</div>
				</div>

				<button class="upload-btn">
					<i class="ri-upload-cloud-2-line"></i>
					<span>Upload New File</span>
				</button>

				<nav class="menu">
					<button
						v-for="item in sidebarMenus"
						:key="item.label"
						class="menu-item"
						:class="{ active: item.active }"
					>
						<i :class="item.icon"></i>
						<span>{{ item.label }}</span>
					</button>
				</nav>
			</aside>

			<!-- Mobile Header -->
			<header class="mobile-header">
				<div class="brand mobile-brand">
					<!--					<i class="ri-google-fill"></i>-->
					<i class="ri-edit-box-fill"></i>
					<div class="brand-text">
						<strong>T.CUBE</strong>
					</div>
				</div>

				<button
					class="hamburger-btn"
					type="button"
					:aria-label="isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
					@click="isMobileMenuOpen = !isMobileMenuOpen"
				>
					<i :class="isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'"></i>
				</button>
			</header>

			<!-- Mobile Dropdown Menu -->
			<section v-if="isMobileMenuOpen" class="mobile-menu-panel">
				<button class="upload-btn mobile-upload">
					<i class="ri-upload-cloud-2-line"></i>
					<span>Upload New File</span>
				</button>

				<nav class="menu">
					<button
						v-for="item in sidebarMenus"
						:key="item.label"
						class="menu-item"
						:class="{ active: item.active }"
					>
						<i :class="item.icon"></i>
						<span>{{ item.label }}</span>
					</button>
				</nav>
			</section>

			<!-- Main -->
			<main class="main">
				<section class="main-inner">
					<!-- 최상단 전용 영역 -->
					<div class="top-toolbar">
						<div class="top-toolbar-icons">
							<button class="device-btn active" type="button">
								<i class="ri-computer-line"></i>
							</button>
							<button class="device-btn" type="button">
								<i class="ri-tablet-line"></i>
							</button>
							<button class="device-btn" type="button">
								<i class="ri-smartphone-line"></i>
							</button>
						</div>
					</div>

					<!-- 실제 본문 -->
					<section class="content-body">
						<header class="content-header">
							<div class="title-box">
								<h1>My Drive</h1>

								<button class="folder-btn">
									<i class="ri-folder-add-line"></i>
								</button>
							</div>

							<!-- 기존 오른쪽 아이콘은 유지해도 되고 빼도 됨 -->
							<div class="view-buttons">
								<button>
									<i class="ri-grid-line"></i>
								</button>
								<button>
									<i class="ri-information-line"></i>
								</button>
							</div>
						</header>

						<section class="quick-section">
							<div class="section-title">QUICK ACCESS</div>

							<div class="quick-grid">
								<article
									v-for="item in quickAccess"
									:key="item.title"
									class="quick-card"
									:class="{ active: item.active }"
								>
									<p class="shared">SHARED WITH</p>

									<div class="avatars">
							<span v-for="person in item.people" :key="person">
								{{ person }}
							</span>
									</div>

									<p class="folder-label">FOLDER</p>
									<h3>{{ item.title }}</h3>

									<i class="ri-pushpin-line pin"></i>
								</article>

								<article class="summary-card">
									<div class="doc-icon">
										<i class="ri-file-list-3-line"></i>
									</div>

									<div class="summary-content">
										<h3>Project Summary for English Class</h3>
										<p>LAST MODIFIED</p>
										<span>Sept 9, 2019 · 04:30 AM</span>
									</div>

									<div class="summary-avatar">J</div>
								</article>
							</div>
						</section>

						<section class="files-section">
							<div class="section-title">ALL FILES</div>

							<div class="table-wrap">
								<div class="table">
									<div class="table-row table-head">
										<div>NAME</div>
										<div>OWNER</div>
										<div>LAST MODIFIED</div>
										<div>FILE SIZE</div>
										<div></div>
										<div></div>
									</div>

									<div
										v-for="file in files"
										:key="file.name"
										class="table-row"
										:class="{ selected: file.selected }"
									>
										<div class="file-name">
											<i :class="file.icon"></i>
											<span>{{ file.name }}</span>
										</div>

										<div>
											<span class="owner">{{ file.owner }}</span>
										</div>

										<div class="muted">{{ file.modified }}</div>
										<div class="muted">{{ file.size }}</div>

										<button class="row-btn">
											<i class="ri-link"></i>
										</button>

										<button class="row-btn">
											<i class="ri-more-2-fill"></i>
										</button>
									</div>
								</div>
							</div>
						</section>
					</section>
				</section>
			</main>
		</div>
	</div>
</template>

<script setup lang="ts">
const isMobileMenuOpen = ref(false)

const sidebarMenus = [
	{ label: 'My drive', icon: 'ri-folder-line', active: true },
	{ label: 'Computers', icon: 'ri-computer-line' },
	{ label: 'Shared with me', icon: 'ri-team-line' },
	{ label: 'Recent', icon: 'ri-time-line' },
	{ label: 'Starred', icon: 'ri-star-line' },
	{ label: 'Trash', icon: 'ri-delete-bin-line' },
	{ label: 'Backups', icon: 'ri-history-line' }
]

const quickAccess = [
	{
		title: 'Design Files',
		people: ['A', 'B', 'C', 'D', 'E'],
		active: true
	},
	{
		title: 'Google Photos',
		people: ['K', 'M', 'R']
	},
	{
		title: 'Training Materials',
		people: ['J', 'L', 'S', 'T']
	}
]

const files = [
	{
		name: 'Weekly Reports.docx',
		owner: 'J',
		modified: 'Sept 9, 2019 · 12:42 AM',
		size: '20 MB',
		icon: 'ri-file-word-2-fill word'
	},
	{
		name: 'Design Checklist.xlsx',
		owner: 'A',
		modified: 'Sept 3, 2019 · 10:42 PM',
		size: '1.3 GB',
		icon: 'ri-file-excel-2-fill excel'
	},
	{
		name: 'Weekly Reports.pdf',
		owner: 'S',
		modified: 'Jul 20, 2019 · 08:42 AM',
		size: '20 MB',
		icon: 'ri-file-pdf-2-fill pdf'
	},
	{
		name: 'Wedding Planner List.docs',
		owner: 'M',
		modified: 'Jul 19, 2019 · 12:42 AM',
		size: '20 MB',
		icon: 'ri-file-word-2-fill word'
	},
	{
		name: 'Team JB Picture.jpg',
		owner: 'J',
		modified: 'Jul 10, 2019 · 08:42 AM',
		size: '12 MB',
		icon: 'ri-image-2-fill image',
		selected: true
	},
	{
		name: 'Team Bert Picture.jpg',
		owner: 'J',
		modified: 'Jul 10, 2019 · 08:40 AM',
		size: '1.5 MB',
		icon: 'ri-image-2-fill image'
	}
]
</script>

<style scoped>
:global(html, body, #__nuxt) {
	margin: 0;
	width: 100%;
	min-height: 100%;
}

:global(body) {
	font-family: Inter, Arial, sans-serif;
	background: #0d1020;
}

* {
	box-sizing: border-box;
}

/* Dark purple-blue palette */
.drive-page {
	--page-bg: #0d1020;
	--surface: #111528;
	--surface-soft: #171c34;
	--surface-soft-2: #1d2340;
	--surface-elevated: #202642;

	--sidebar-start: #4f5cff;
	--sidebar-end: #3337a8;

	--accent: #8b91ff;
	--accent-2: #777dff;
	--accent-3: #656cff;
	--accent-soft: rgba(139, 145, 255, 0.14);
	--accent-soft-2: rgba(139, 145, 255, 0.22);

	--text-strong: #f4f6ff;
	--text-primary: #dfe3ff;
	--text-secondary: #aeb7e8;
	--text-muted: #727da8;

	--line: rgba(174, 183, 232, 0.12);
	--row-selected: rgba(139, 145, 255, 0.16);

	width: 100%;
	min-height: 100vh;
	background: var(--page-bg);
	padding: 0;
	color: var(--text-primary);
}

.drive-shell {
	width: 100%;
	min-height: 100vh;
	display: grid;
	grid-template-columns: 220px 1fr;
	background: var(--surface);
	border-radius: 0;
	overflow: hidden;
	box-shadow: none;
}

/* Sidebar */
.sidebar {
	background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
	padding: 24px 18px;
	color: #ffffff;
}

.brand {
	display: flex;
	align-items: center;
	gap: 12px;
	color: #ffffff;
}

.brand i {
	font-size: 24px;
	line-height: 1;
}

.brand-text {
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.brand strong {
	display: block;
	font-size: 24px;
	line-height: 0.9;
	font-weight: 800;
}

.sidebar .brand {
	margin-bottom: 28px;
}

.upload-btn {
	width: 100%;
	height: 44px;
	border: 0;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.95);
	color: #4d53d9;
	font-size: 13px;
	font-weight: 800;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	margin-bottom: 22px;
	cursor: pointer;
	box-shadow: 0 12px 24px rgba(7, 10, 32, 0.22);
}

.upload-btn i {
	font-size: 16px;
	line-height: 1;
}

.menu {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.menu-item {
	width: 100%;
	height: 38px;
	border: 0;
	border-radius: 10px;
	background: transparent;
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 12px;
	padding: 0 12px;
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
	text-align: left;
}

.menu-item i {
	width: 18px;
	font-size: 17px;
	line-height: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.menu-item span {
	line-height: 1;
}

.menu-item.active {
	background: rgba(255, 255, 255, 0.18);
}

.menu-item:hover {
	background: rgba(255, 255, 255, 0.12);
}

/* Mobile Header */
.mobile-header {
	display: none;
}

.mobile-menu-panel {
	display: none;
}

/* Main */
.main {
	background: var(--surface);
	padding: 0;
}

.main-inner {
	min-height: 100vh;
	background:
		radial-gradient(circle at 70% 0%, rgba(101, 108, 255, 0.08) 0, transparent 32%),
		var(--surface);
	border-radius: 0;
	display: flex;
	flex-direction: column;
}

.top-toolbar {
	height: 74px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1px solid var(--line);
	background: rgba(17, 21, 40, 0.92);
	flex-shrink: 0;
	backdrop-filter: blur(14px);
}

.top-toolbar-icons {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(174, 183, 232, 0.12);
	box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.device-btn {
	width: 34px;
	height: 34px;
	border: 0;
	border-radius: 9px;
	background: transparent;
	color: var(--text-muted);
	display: grid;
	place-items: center;
	cursor: pointer;
	transition: 0.2s ease;
}

.device-btn i {
	font-size: 17px;
	line-height: 1;
}

.device-btn:hover {
	background: rgba(139, 145, 255, 0.12);
	color: var(--accent);
}

.device-btn.active {
	background: rgba(139, 145, 255, 0.2);
	color: #ffffff;
	box-shadow: inset 0 0 0 1px rgba(139, 145, 255, 0.28);
}

.content-body {
	padding: 34px 34px 30px;
}

.content-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 28px;
}

.title-box {
	display: flex;
	align-items: center;
	gap: 10px;
}

.title-box h1 {
	margin: 0;
	color: var(--text-strong);
	font-size: 31px;
	line-height: 1;
	font-weight: 900;
	letter-spacing: 0.2px;
}

.folder-btn,
.view-buttons button {
	width: 31px;
	height: 31px;
	border: 0;
	border-radius: 9px;
	background: var(--surface-soft-2);
	color: var(--accent);
	display: grid;
	place-items: center;
	cursor: pointer;
}

.folder-btn {
	background: var(--surface-elevated);
	box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
}

.view-buttons {
	display: flex;
	gap: 9px;
}

.section-title {
	font-size: 10px;
	letter-spacing: 1.8px;
	color: var(--text-secondary);
	font-weight: 900;
	margin-bottom: 14px;
}

.quick-section {
	margin-bottom: 28px;
}

.quick-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr 1.08fr;
	gap: 14px;
}

.quick-card,
.summary-card {
	min-height: 114px;
	border-radius: 14px;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.035));
	padding: 15px;
	position: relative;
	border: 1px solid rgba(174, 183, 232, 0.1);
	box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
}

.quick-card.active {
	background: linear-gradient(180deg, var(--accent-2) 0%, var(--accent-3) 100%);
	color: #ffffff;
	border-color: rgba(255, 255, 255, 0.18);
	box-shadow: 0 18px 36px rgba(101, 108, 255, 0.24);
}

.shared,
.folder-label {
	margin: 0;
	font-size: 8px;
	line-height: 1;
	letter-spacing: 0.9px;
	color: var(--text-muted);
	font-weight: 900;
}

.quick-card.active .shared,
.quick-card.active .folder-label {
	color: rgba(255, 255, 255, 0.74);
}

.avatars {
	display: flex;
	margin-top: 8px;
	margin-bottom: 16px;
}

.avatars span {
	width: 19px;
	height: 19px;
	border-radius: 50%;
	background: rgba(139, 145, 255, 0.16);
	color: #cfd4ff;
	display: grid;
	place-items: center;
	font-size: 8px;
	font-weight: 900;
	border: 1.5px solid var(--surface);
	margin-left: -3px;
}

.avatars span:first-child {
	margin-left: 0;
}

.quick-card.active .avatars span {
	background: rgba(255, 255, 255, 0.22);
	color: #ffffff;
	border-color: rgba(255, 255, 255, 0.5);
}

.quick-card h3 {
	margin: 5px 0 0;
	color: var(--text-strong);
	font-size: 12px;
	line-height: 1.25;
	font-weight: 800;
}

.quick-card.active h3 {
	color: #ffffff;
}

.pin {
	position: absolute;
	right: 14px;
	bottom: 14px;
	font-size: 13px;
	color: var(--text-muted);
}

.quick-card.active .pin {
	color: rgba(255, 255, 255, 0.75);
}

/* Summary */
.summary-card {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.doc-icon {
	width: 29px;
	height: 29px;
	border-radius: 8px;
	background: rgba(139, 145, 255, 0.16);
	color: var(--accent);
	display: grid;
	place-items: center;
	flex-shrink: 0;
}

.summary-content {
	flex: 1;
}

.summary-content h3 {
	margin: 1px 0 12px;
	color: var(--text-strong);
	font-size: 12px;
	line-height: 1.25;
	font-weight: 900;
}

.summary-content p {
	margin: 0 0 4px;
	font-size: 8px;
	letter-spacing: 1.4px;
	color: var(--text-muted);
	font-weight: 900;
}

.summary-content span {
	font-size: 10px;
	color: var(--text-secondary);
	font-weight: 600;
}

.summary-avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: rgba(59, 210, 131, 0.18);
	color: #77eba7;
	display: grid;
	place-items: center;
	font-size: 11px;
	font-weight: 900;
}

/* Table */
.files-section {
	position: relative;
}

.table-wrap {
	position: relative;
	width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	padding-bottom: 10px;
	border-radius: 14px;
	scrollbar-width: thin;
	scrollbar-color: #777dff rgba(139, 145, 255, 0.12);
}

.table-wrap::-webkit-scrollbar {
	height: 10px;
}

.table-wrap::-webkit-scrollbar-track {
	background: rgba(139, 145, 255, 0.12);
	border-radius: 999px;
}

.table-wrap::-webkit-scrollbar-thumb {
	background: linear-gradient(90deg, #666dff, #969bff);
	border-radius: 999px;
}

.table-wrap::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(90deg, #767cff, #a4a8ff);
}

.table-wrap::-webkit-scrollbar-corner {
	background: transparent;
}

.table {
	background: rgba(255, 255, 255, 0.035);
	border: 1px solid rgba(174, 183, 232, 0.1);
	border-radius: 14px;
	overflow: hidden;
	box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
}

.table-row {
	display: grid;
	grid-template-columns: 2.35fr 0.85fr 1.75fr 0.75fr 0.35fr 0.35fr;
	align-items: center;
	min-height: 45px;
	padding: 0 15px;
	border-bottom: 1px solid var(--line);
	column-gap: 12px;
}

.table-row:last-child {
	border-bottom: 0;
}

.table-head {
	min-height: 36px;
	color: var(--text-muted);
	font-size: 8px;
	font-weight: 900;
	letter-spacing: 1.5px;
	background: rgba(255, 255, 255, 0.025);
}

.file-name {
	display: flex;
	align-items: center;
	gap: 10px;
	color: var(--text-primary);
	font-size: 12px;
	font-weight: 700;
}

.file-name i {
	font-size: 15px;
}

.word {
	color: #8f98ff;
}

.excel {
	color: #5ee39a;
}

.pdf {
	color: #ff7787;
}

.image {
	color: #ffb86b;
}

.owner {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: rgba(139, 145, 255, 0.16);
	color: #cfd4ff;
	display: grid;
	place-items: center;
	font-size: 9px;
	font-weight: 900;
}

.muted {
	color: var(--text-secondary);
	font-size: 11px;
	font-weight: 600;
}

.selected {
	background: var(--row-selected);
}

.row-btn {
	border: 0;
	background: transparent;
	color: var(--text-secondary);
	font-size: 15px;
	cursor: pointer;
}

/* Tablet */
@media (max-width: 1100px) {
	.drive-shell {
		grid-template-columns: 200px 1fr;
	}

	.quick-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.table-row {
		grid-template-columns: 2fr 0.6fr 1.4fr 0.7fr 0.3fr 0.3fr;
	}
}

/* Mobile */
@media (max-width: 760px) {
	.drive-page {
		padding: 0;
	}

	.drive-shell {
		min-height: 100vh;
		display: block;
		border-radius: 0;
	}

	.desktop-sidebar {
		display: none;
	}

	.mobile-header {
		height: 72px;
		background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 18px;
	}

	.mobile-header .brand {
		min-height: 32px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mobile-header .brand i {
		font-size: 18px;
		line-height: 1;
	}

	.mobile-header .brand-text {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 2px;
	}

	.mobile-header .brand strong {
		display: inline;
		font-size: 15px;
		line-height: 1;
		font-weight: 800;
	}

	.hamburger-btn {
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.95);
		color: #2c306e;
		display: grid;
		place-items: center;
		cursor: pointer;
		box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}

	.hamburger-btn i {
		font-size: 22px;
		line-height: 1;
	}

	.mobile-menu-panel {
		display: block;
		background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
		color: #ffffff;
		min-height: 450px;
		padding: 22px 18px 28px;
		border: 0;
	}

	.mobile-menu-panel .mobile-upload {
		margin-bottom: 22px;
	}

	.mobile-menu-panel .menu {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.mobile-menu-panel .menu-item {
		width: 100%;
		height: 38px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 12px;
		padding: 0 12px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
	}

	.mobile-menu-panel .menu-item i {
		width: 18px;
		font-size: 17px;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.mobile-menu-panel .menu-item span {
		line-height: 1;
	}

	.mobile-menu-panel .menu-item.active {
		background: rgba(255, 255, 255, 0.16);
	}

	.mobile-menu-panel .menu-item:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.main {
		padding: 0;
	}

	.main-inner {
		min-height: auto;
		border-radius: 0;
		padding: 0;
	}

	.top-toolbar {
		height: 62px;
	}

	.top-toolbar-icons {
		padding: 5px;
		gap: 6px;
		border-radius: 10px;
	}

	.device-btn {
		width: 30px;
		height: 30px;
		border-radius: 8px;
	}

	.device-btn i {
		font-size: 15px;
	}

	.content-body {
		padding: 28px 22px 36px;
	}

	.content-header {
		margin-bottom: 26px;
	}

	.title-box h1 {
		font-size: 36px;
	}

	.view-buttons {
		display: none;
	}

	.quick-grid {
		grid-template-columns: 1fr;
	}

	.quick-card,
	.summary-card {
		min-height: 118px;
	}

	.table {
		min-width: 760px;
	}
}
</style>