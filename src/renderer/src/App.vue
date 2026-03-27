<template>
  <div class="app-layout">
    <!-- Top Navigation Bar -->
    <header class="top-nav">
      <nav class="nav-left">
        <router-link to="/workspace" class="nav-tab" active-class="is-active">
          <el-icon><FolderOpened /></el-icon>
          <span>{{ $t("nav.workspace") }}</span>
        </router-link>
      </nav>
      <div class="nav-spacer"></div>
      <div class="nav-right">
        <router-link
          to="/settings"
          class="settings-btn"
          active-class="is-active"
        >
          <el-icon :size="18"><Setting /></el-icon>
        </router-link>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Status Bar (hidden when workspace has files — action bar takes over) -->
    <footer v-if="!isWorkspaceWithFiles" class="status-bar">
      <div class="status-left">
        <span>{{ $t("app.ready") }}</span>
      </div>
      <div class="status-right">
        <span>{{
          $t("app.filesLoaded", { count: fileStore.files.length })
        }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { FolderOpened, Setting } from "@element-plus/icons-vue";
import { useFileStore } from "@/stores/file.store";
import { useAiStore } from "@/stores/ai.store";

const route = useRoute();
const fileStore = useFileStore();
const aiStore = useAiStore();

const isWorkspaceWithFiles = computed(
  () => route.path === "/workspace" && fileStore.files.length > 0,
);

// Auto-load AI model on app start
onMounted(() => {
  aiStore.loadModel();
});
</script>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== Top Navigation Bar ===== */
.top-nav {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--app-bg);
  border-bottom: 1px solid var(--app-border);
  gap: 16px;
  -webkit-app-region: drag;
}

.nav-left {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.nav-spacer {
  flex: 1;
  -webkit-app-region: drag;
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-regular);
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  cursor: pointer;
}

.nav-tab :deep(.el-icon) {
  font-size: 18px;
}

.nav-tab:hover {
  background: var(--app-bg-secondary);
  color: var(--app-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.nav-tab.is-active {
  background: var(--app-primary-light);
  color: var(--app-primary);
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
}

.nav-right {
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--app-text-secondary);
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.settings-btn:hover {
  background: var(--app-bg-secondary);
  color: var(--app-primary);
  transform: rotate(60deg);
}

.settings-btn.is-active {
  background: var(--app-primary-light);
  color: var(--app-primary);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--app-bg);
}

/* ===== Status Bar ===== */
.status-bar {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--app-bg-secondary);
  border-top: 1px solid var(--app-border);
  font-size: 12px;
  color: var(--app-text-secondary);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
