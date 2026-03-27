<template>
  <div
    class="import-area"
    :class="{ 'is-compact': compact, 'is-dragover': isDragOver }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Full mode (no files) -->
    <template v-if="!compact">
      <div class="import-content">
        <el-icon class="import-icon" :size="56"><UploadFilled /></el-icon>
        <p class="import-text">{{ $t('import.dragHint') }}</p>
        <p class="import-hint">{{ $t('import.formatHint') }}</p>
        <div class="import-actions">
          <el-button type="primary" size="large" @click="$emit('importFiles')">
            <el-icon><FolderOpened /></el-icon>
            {{ $t('import.selectFiles') }}
          </el-button>
          <el-button size="large" @click="$emit('importFolder')">
            <el-icon><Folder /></el-icon>
            {{ $t('import.selectFolder') }}
          </el-button>
        </div>
      </div>
    </template>

    <!-- Compact mode (has files) -->
    <template v-else>
      <div class="compact-bar">
        <div class="compact-info">
          <el-icon><PictureFilled /></el-icon>
          <span>{{ $t('import.fileCount', { count: fileCount }) }}</span>
        </div>
        <div class="compact-actions">
          <el-button size="small" @click="$emit('importFiles')">
            <el-icon><Plus /></el-icon>
            {{ $t('import.addFiles') }}
          </el-button>
          <el-button size="small" @click="$emit('importFolder')">
            <el-icon><FolderAdd /></el-icon>
            {{ $t('import.addFolder') }}
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            @click="$emit('clearFiles')"
          >
            <el-icon><Delete /></el-icon>
            {{ $t('import.clear') }}
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  UploadFilled,
  FolderOpened,
  Folder,
  PictureFilled,
  Plus,
  FolderAdd,
  Delete,
} from "@element-plus/icons-vue";

defineProps<{
  compact: boolean;
  fileCount: number;
}>();

const emit = defineEmits<{
  importFiles: [];
  importFolder: [];
  clearFiles: [];
  drop: [paths: string[]];
}>();

const isDragOver = ref(false);

function onDragOver(): void {
  isDragOver.value = true;
}

function onDragLeave(): void {
  isDragOver.value = false;
}

function onDrop(event: DragEvent): void {
  isDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // Retrieve paths stored by preload's capture-phase drop handler
  const paths = window.api.getLastDropPaths().filter(Boolean);
  if (paths.length > 0) {
    emit("drop", paths);
  }
}
</script>

<style scoped>
.import-area {
  border: 2px dashed var(--app-border-dashed);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.import-area:not(.is-compact):hover {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary-light) 50%, transparent);
}

.import-area:not(.is-compact):hover .import-icon {
  color: var(--app-primary);
  transform: translateY(-4px);
}

.import-area.is-dragover {
  border-color: var(--app-primary);
  background-color: var(--app-primary-light);
  transform: scale(1.01);
}

.import-area:not(.is-compact) {
  padding: 56px 24px;
  text-align: center;
}

.import-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.import-icon {
  color: var(--app-text-placeholder);
  transition: all 0.3s ease;
}

.import-text {
  font-size: 17px;
  font-weight: 500;
  color: var(--app-text-regular);
}

.import-hint {
  font-size: 13px;
  color: var(--app-text-placeholder);
}

.import-actions {
  margin-top: 20px;
  display: flex;
  gap: 16px;
}

.import-actions :deep(.el-button) {
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.import-actions :deep(.el-button .el-icon) {
  font-size: 18px;
}

.import-actions :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

.import-actions :deep(.el-button:active) {
  transform: translateY(0);
}

.import-actions :deep(.el-button:not(.el-button--primary):hover) {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* Compact mode */
.import-area.is-compact {
  padding: 8px 12px;
  border-style: solid;
  border-color: var(--app-border);
}

.compact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.compact-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--app-text-regular);
}

.compact-actions {
  display: flex;
  gap: 8px;
}
</style>
