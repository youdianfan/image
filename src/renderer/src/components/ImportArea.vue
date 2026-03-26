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
        <el-icon class="import-icon" :size="48"><UploadFilled /></el-icon>
        <p class="import-text">拖拽图片文件到此处</p>
        <p class="import-hint">支持 PNG / JPG / JPEG / WEBP / GIF / HEIC</p>
        <div class="import-actions">
          <el-button type="primary" @click="$emit('importFiles')">
            <el-icon><FolderOpened /></el-icon>
            选择文件
          </el-button>
          <el-button @click="$emit('importFolder')">
            <el-icon><Folder /></el-icon>
            选择文件夹
          </el-button>
        </div>
      </div>
    </template>

    <!-- Compact mode (has files) -->
    <template v-else>
      <div class="compact-bar">
        <div class="compact-info">
          <el-icon><PictureFilled /></el-icon>
          <span>{{ fileCount }} 个文件</span>
        </div>
        <div class="compact-actions">
          <el-button size="small" @click="$emit('importFiles')">
            <el-icon><Plus /></el-icon>
            添加文件
          </el-button>
          <el-button size="small" @click="$emit('importFolder')">
            <el-icon><FolderAdd /></el-icon>
            添加文件夹
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            @click="$emit('clearFiles')"
          >
            <el-icon><Delete /></el-icon>
            清空
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

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic"]);

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

  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // In Electron with sandbox:false, File.path is available
    const filePath = (file as File & { path: string }).path;
    if (filePath) {
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      if (IMAGE_EXTENSIONS.has(ext)) {
        paths.push(filePath);
      }
    }
  }

  if (paths.length > 0) {
    emit("drop", paths);
  }
}
</script>

<style scoped>
.import-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.2s;
}

.import-area.is-dragover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.import-area:not(.is-compact) {
  padding: 48px 24px;
  text-align: center;
}

.import-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.import-icon {
  color: #c0c4cc;
}

.import-text {
  font-size: 16px;
  color: #606266;
}

.import-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.import-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

/* Compact mode */
.import-area.is-compact {
  padding: 8px 12px;
  border-style: solid;
  border-color: #e4e7ed;
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
  color: #606266;
}

.compact-actions {
  display: flex;
  gap: 8px;
}
</style>
