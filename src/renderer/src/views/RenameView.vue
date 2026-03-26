<template>
  <div class="rename-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>批量重命名</h2>
        <p class="page-desc">导入图片文件，设置命名规则，批量重命名</p>
      </div>
      <div v-if="fileStore.files.length > 0" class="header-actions">
        <el-button
          type="primary"
          :disabled="!canExecute"
          @click="executeRename"
        >
          <el-icon><Check /></el-icon>
          执行重命名
        </el-button>
      </div>
    </div>

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
      <div class="rename-body">
        <div class="rename-main">
          <ImportArea
            :compact="true"
            :file-count="fileStore.files.length"
            @import-files="handleImportFiles"
            @import-folder="handleImportFolder"
            @drop="handleDrop"
            @clear-files="handleClear"
          />
          <FileList
            :items="previewItems"
            :max-height="tableMaxHeight"
            @remove="onRemoveFile"
            @edit-name="onEditName"
          />
        </div>
        <div class="rename-sidebar">
          <RuleEditor />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Check } from "@element-plus/icons-vue";
import { useFileStore } from "@/stores/file.store";
import { useFileImport } from "@/composables/useFileImport";
import { useRename } from "@/composables/useRename";
import ImportArea from "@/components/ImportArea.vue";
import FileList from "@/components/FileList.vue";
import RuleEditor from "@/components/RuleEditor.vue";

const fileStore = useFileStore();
const { handleImportFiles, handleImportFolder, handleDrop, handleClear } =
  useFileImport();
const {
  previewItems,
  canExecute,
  executeRename,
  setupProgressListener,
  cleanupProgressListener,
} = useRename();

const tableMaxHeight = ref(500);

function onRemoveFile(id: string): void {
  fileStore.removeFile(id);
}

function onEditName(id: string, newName: string): void {
  fileStore.setManualOverride(id, newName);
}

function updateTableHeight(): void {
  // Reserve space for header (80px), import bar (52px), padding
  tableMaxHeight.value = window.innerHeight - 230;
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
.rename-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-left h2 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.page-desc {
  font-size: 13px;
  color: #909399;
}

.rename-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.rename-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rename-sidebar {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
}
</style>
