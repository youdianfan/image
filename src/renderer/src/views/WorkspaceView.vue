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
          <el-button size="small" @click="handleImportFiles">
            <el-icon><Plus /></el-icon> {{ $t('workspace.add') }}
          </el-button>
          <el-button size="small" type="danger" plain @click="handleClear">
            <el-icon><Delete /></el-icon> {{ $t('workspace.clear') }}
          </el-button>
          <span class="file-count">{{ $t('workspace.fileCount', { count: fileStore.files.length }) }}</span>
        </div>
        <div class="toolbar-right">
          <el-button
            type="primary"
            :disabled="!canExecute"
            @click="execute"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ $t('workspace.execute') }}
          </el-button>
        </div>
      </div>

      <!-- Main body -->
      <div class="workspace-body">
        <div class="workspace-main">
          <FileList
            :items="previewItems"
            :max-height="tableMaxHeight"
            @remove="onRemoveFile"
            @edit-name="onEditName"
          />
        </div>
        <div class="workspace-sidebar">
          <SettingsPanel />
        </div>
      </div>

      <!-- Drop overlay -->
      <Transition name="fade">
        <div v-show="isDragOver" class="drop-overlay">
          <el-icon :size="48" color="var(--app-primary)"><Upload /></el-icon>
          <span class="drop-text">{{ $t('workspace.dropToAdd') }}</span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Plus, Delete, VideoPlay, Upload } from "@element-plus/icons-vue";
import { useFileStore } from "@/stores/file.store";
import { useFileImport } from "@/composables/useFileImport";
import { useWorkspace } from "@/composables/useWorkspace";
import ImportArea from "@/components/ImportArea.vue";
import FileList from "@/components/FileList.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";

const fileStore = useFileStore();
const { handleImportFiles, handleImportFolder, handleDrop, handleClear } =
  useFileImport();
const {
  previewItems,
  canExecute,
  execute,
  setupProgressListener,
  cleanupProgressListener,
} = useWorkspace();

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

function updateTableHeight(): void {
  tableMaxHeight.value = window.innerHeight - 200;
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
  margin-bottom: 12px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-count {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-left: 4px;
}

.workspace-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.workspace-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.workspace-sidebar {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid var(--app-border);
  overflow-y: auto;
}

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
