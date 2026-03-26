<template>
  <div class="app-layout">
    <!-- Top Navigation Bar -->
    <header class="top-nav">
      <div class="nav-left">
        <span class="app-logo">Image Rename AI</span>
      </div>
      <nav class="nav-tabs">
        <router-link
          v-for="tab in navTabs"
          :key="tab.path"
          :to="tab.path"
          class="nav-tab"
          active-class="is-active"
        >
          <el-icon><component :is="tab.icon" /></el-icon>
          <span>{{ tab.label }}</span>
        </router-link>
      </nav>
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

    <!-- Status Bar -->
    <footer class="status-bar">
      <div class="status-left">
        <template v-if="taskStore.currentTask">
          <span class="task-message">{{ taskStore.currentTask.message }}</span>
          <el-progress
            :percentage="taskStore.currentTask.progress"
            :stroke-width="10"
            :show-text="false"
            class="task-progress"
            :status="
              taskStore.currentTask.status === 'failed'
                ? 'exception'
                : undefined
            "
          />
          <span class="task-percent"
            >{{ taskStore.currentTask.progress }}%</span
          >
          <el-button
            v-if="
              taskStore.currentTask.status === 'done' ||
              taskStore.currentTask.status === 'failed'
            "
            size="small"
            text
            @click="taskStore.clearTask()"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </template>
        <span v-else>就绪</span>
      </div>
      <div class="status-right">
        <span>{{ fileStore.files.length }} 个文件已加载</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { markRaw, onMounted } from "vue";
import {
  FolderOpened,
  Switch,
  Setting,
  Close,
} from "@element-plus/icons-vue";
import { useFileStore } from "@/stores/file.store";
import { useTaskStore } from "@/stores/task.store";
import { useAiStore } from "@/stores/ai.store";

const fileStore = useFileStore();
const taskStore = useTaskStore();
const aiStore = useAiStore();

// Auto-load AI model on app start
onMounted(() => {
  aiStore.loadModel();
});

const navTabs = [
  { path: "/workspace", label: "工作台", icon: markRaw(FolderOpened) },
  { path: "/format", label: "格式转换", icon: markRaw(Switch) },
];
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
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  gap: 16px;
  -webkit-app-region: drag; /* Allow window dragging */
}

.nav-left {
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.app-logo {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 0.3px;
  user-select: none;
}

.nav-tabs {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  text-decoration: none;
  transition: all 0.2s;
  user-select: none;
  cursor: pointer;
}

.nav-tab:hover {
  background: #f5f7fa;
  color: #303133;
}

.nav-tab.is-active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.nav-right {
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #909399;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.settings-btn:hover {
  background: #f5f7fa;
  color: #606266;
}

.settings-btn.is-active {
  background: #ecf5ff;
  color: #409eff;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

/* ===== Status Bar ===== */
.status-bar {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #909399;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-message {
  white-space: nowrap;
}

.task-progress {
  width: 120px;
}

.task-percent {
  font-size: 11px;
  min-width: 32px;
}
</style>
