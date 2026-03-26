<template>
  <el-container class="app-container">
    <!-- Left Sidebar -->
    <el-aside width="200px">
      <div class="sidebar">
        <div class="sidebar-header">
          <h1 class="app-title">Image Rename AI</h1>
        </div>
        <el-menu
          :default-active="currentRoute"
          router
          class="sidebar-menu"
        >
          <el-menu-item index="/rename">
            <el-icon><EditPen /></el-icon>
            <span>批量重命名</span>
          </el-menu-item>
          <el-menu-item index="/format">
            <el-icon><Switch /></el-icon>
            <span>格式转换</span>
          </el-menu-item>
          <el-menu-item index="/compress">
            <el-icon><PictureFilled /></el-icon>
            <span>图片压缩</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-aside>

    <!-- Main Area -->
    <el-container class="main-container">
      <!-- Content -->
      <el-main class="main-content">
        <router-view />
      </el-main>

      <!-- Status Bar -->
      <el-footer class="status-bar" height="36px">
        <div class="status-left">
          <span v-if="taskStore.currentTask">
            {{ taskStore.currentTask.message }}
            ({{ taskStore.currentTask.completed }}/{{ taskStore.currentTask.total }})
          </span>
          <span v-else>就绪</span>
        </div>
        <div class="status-right">
          <span>{{ fileStore.files.length }} 个文件已加载</span>
        </div>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { EditPen, Switch, PictureFilled, Setting } from '@element-plus/icons-vue'
import { useFileStore } from '@/stores/file.store'
import { useTaskStore } from '@/stores/task.store'

const route = useRoute()
const fileStore = useFileStore()
const taskStore = useTaskStore()

const currentRoute = computed(() => route.path)
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
}

.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background-color: transparent;
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.main-content {
  overflow-y: auto;
  padding: 20px;
  background-color: #fff;
}

.status-bar {
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
</style>
