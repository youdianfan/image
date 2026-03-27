<template>
  <div
    class="workspace-view"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Empty state -->
    <template v-if="fileStore.files.length === 0">
      <ImportArea
        :compact="false"
        :file-count="0"
        @import-files="handleImportFiles"
        @import-folder="handleImportFolder"
        @drop="handleDrop"
      />
    </template>

    <!-- Working state -->
    <template v-else>
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button @click="handleImportFiles">
            <el-icon><Plus /></el-icon> {{ $t("workspace.add") }}
          </el-button>
          <el-button @click="handleImportFolder">
            <el-icon><FolderAdd /></el-icon> {{ $t("import.addFolder") }}
          </el-button>
          <el-button type="danger" plain @click="handleClear">
            <el-icon><Delete /></el-icon> {{ $t("workspace.clear") }}
          </el-button>
          <span class="file-count">{{
            $t("workspace.fileCount", { count: fileStore.files.length })
          }}</span>
        </div>
        <div class="toolbar-right">
          <el-button size="small" @click="openOutputDirectory">
            <el-icon><FolderOpened /></el-icon>
            <span>{{ $t("workspace.openOutputDir") }}</span>
          </el-button>
        </div>
      </div>

      <!-- Config Bar -->
      <ConfigBar />

      <!-- Main body -->
      <div class="workspace-body">
        <FileList
          :items="previewItems"
          :max-height="tableMaxHeight"
          :is-task-running="taskStore.isRunning"
          @remove="onRemoveFile"
          @edit-name="onEditName"
          @compress="onCompressFile"
        />
      </div>

      <!-- Bottom Action Bar -->
      <div class="action-bar" :class="actionBarClass">
        <!-- Progress bar overlay -->
        <div
          v-if="taskStore.currentTask"
          class="action-bar-progress"
          :class="{
            'progress-done': taskStore.currentTask.status === 'done',
            'progress-failed': taskStore.currentTask.status === 'failed',
          }"
          :style="{ width: taskStore.currentTask.progress + '%' }"
        />
        <div class="action-bar-left">
          <template v-if="taskStore.currentTask">
            <template v-if="taskStore.currentTask.status === 'done'">
              <el-icon class="status-icon done"><CircleCheck /></el-icon>
              <span class="action-status-text done">{{ taskStore.currentTask.message }}</span>
            </template>
            <template v-else-if="taskStore.currentTask.status === 'failed'">
              <el-icon class="status-icon failed"><CircleClose /></el-icon>
              <span class="action-status-text failed">{{ taskStore.currentTask.message }}</span>
            </template>
            <template v-else>
              <el-icon class="status-icon running"><Loading /></el-icon>
              <span class="action-status-text">{{ taskStore.currentTask.message }}</span>
              <span class="action-percent">{{ taskStore.currentTask.progress }}%</span>
            </template>
          </template>
          <template v-else>
            <el-icon class="status-icon"><CircleCheck /></el-icon>
            <span class="action-status-text idle">{{ $t("app.ready") }}</span>
            <span class="action-divider">|</span>
            <span class="action-file-count">{{
              $t("app.filesLoaded", { count: fileStore.files.length })
            }}</span>
          </template>
        </div>
        <div class="action-bar-right">
          <el-button
            v-if="!taskStore.isRunning"
            type="primary"
            size="large"
            :disabled="!canExecute"
            class="execute-btn"
            @click="execute"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ $t("workspace.execute") }}
          </el-button>
          <el-button
            v-else
            type="danger"
            size="large"
            :loading="taskStore.isCancelling"
            class="execute-btn"
            @click="cancelExecution"
          >
            <el-icon v-if="!taskStore.isCancelling"><VideoPause /></el-icon>
            {{ $t("workspace.cancel") }}
          </el-button>
        </div>
      </div>

      <!-- Drop overlay -->
      <Transition name="fade">
        <div v-show="isDragOver" class="drop-overlay">
          <el-icon :size="48" color="var(--app-primary)"><Upload /></el-icon>
          <span class="drop-text">{{ $t("workspace.dropToAdd") }}</span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  Plus,
  Delete,
  VideoPlay,
  VideoPause,
  Upload,
  CircleCheck,
  CircleClose,
  Loading,
  FolderOpened,
  FolderAdd,
} from "@element-plus/icons-vue";
import { useFileStore } from "@/stores/file.store";
import { useTaskStore } from "@/stores/task.store";
import { useFileImport } from "@/composables/useFileImport";
import { useWorkspace } from "@/composables/useWorkspace";
import ImportArea from "@/components/ImportArea.vue";
import FileList from "@/components/FileList.vue";
import ConfigBar from "@/components/ConfigBar.vue";

const fileStore = useFileStore();
const taskStore = useTaskStore();
const { handleImportFiles, handleImportFolder, handleDrop, handleClear } =
  useFileImport();
const {
  previewItems,
  canExecute,
  execute,
  cancelExecution,
  openOutputDirectory,
  setupProgressListener,
  cleanupProgressListener,
  compressSingleFile,
} = useWorkspace();

const actionBarClass = computed(() => {
  const status = taskStore.currentTask?.status;
  return {
    "is-running": taskStore.isRunning,
    "is-done": status === "done",
    "is-failed": status === "failed",
  };
});

const tableMaxHeight = ref(500);
const isDragOver = ref(false);
const dragCounter = ref(0);

function onDragEnter(): void {
  if (fileStore.files.length === 0) return;
  dragCounter.value++;
  isDragOver.value = true;
}

function onDragLeave(): void {
  if (fileStore.files.length === 0) return;
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    dragCounter.value = 0;
    isDragOver.value = false;
  }
}

function onDrop(): void {
  dragCounter.value = 0;
  isDragOver.value = false;
  if (fileStore.files.length === 0) return;
  const paths = window.api.getLastDropPaths();
  if (paths.length > 0) {
    handleDrop(paths);
  }
}

function onRemoveFile(id: string): void {
  fileStore.removeFile(id);
}

function onEditName(id: string, newName: string): void {
  fileStore.setManualOverride(id, newName);
}

function onCompressFile(id: string): void {
  compressSingleFile(id);
}

function updateTableHeight(): void {
  // 52px nav + ~44px toolbar + ~44px config bar + 48px action bar + paddings
  tableMaxHeight.value = window.innerHeight - 264;
}

onMounted(() => {
  setupProgressListener();
  updateTableHeight();
  window.addEventListener("resize", updateTableHeight);
});

onUnmounted(() => {
  cleanupProgressListener();
  window.removeEventListener("resize", updateTableHeight);
});
</script>

<style scoped>
.workspace-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.toolbar-left :deep(.el-button) {
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toolbar-left :deep(.el-button .el-icon) {
  font-size: 16px;
}

.toolbar-left :deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toolbar-left :deep(.el-button:active) {
  transform: translateY(0);
}

.file-count {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-left: 4px;
}

.workspace-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* ===== Bottom Action Bar ===== */
.action-bar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-top: 12px;
  background: var(--app-bg-secondary);
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.action-bar.is-running {
  border-color: var(--app-primary);
}

.action-bar.is-done {
  border-color: var(--app-success);
}

.action-bar.is-failed {
  border-color: var(--app-danger);
}

.action-bar-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  background: var(--app-primary);
  transition: width 0.3s ease;
  border-radius: 0 2px 2px 0;
}

.action-bar-progress.progress-done {
  background: var(--app-success);
  width: 100% !important;
}

.action-bar-progress.progress-failed {
  background: var(--app-danger);
}

.action-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.action-bar-left .status-icon {
  font-size: 16px;
  color: var(--app-success);
  flex-shrink: 0;
}

.status-icon.running {
  color: var(--app-primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.action-status-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-status-text.idle {
  color: var(--app-text-secondary);
}

.action-status-text.done {
  color: var(--app-success);
}

.action-status-text.failed {
  color: var(--app-danger);
}

.status-icon.done {
  color: var(--app-success);
}

.status-icon.failed {
  color: var(--app-danger);
}

.action-divider {
  color: var(--app-border);
  font-size: 12px;
}

.action-file-count {
  font-size: 12px;
  color: var(--app-text-placeholder);
  white-space: nowrap;
}

.action-percent {
  font-size: 12px;
  min-width: 36px;
  text-align: right;
  color: var(--app-text-secondary);
}

.action-bar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.execute-btn {
  min-width: 140px;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.execute-btn :deep(.el-icon) {
  font-size: 18px;
}

.execute-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.35);
}

.execute-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
}

:deep(.el-button--danger).execute-btn:hover {
  box-shadow: 0 6px 20px rgba(245, 108, 108, 0.35);
}

/* ===== Drop Overlay ===== */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px;
  border: 2px dashed var(--app-primary);
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-bg) 88%, transparent);
  backdrop-filter: blur(2px);
}

.drop-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--app-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
