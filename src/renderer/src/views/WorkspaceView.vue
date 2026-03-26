<template>
  <div class="workspace-view">
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
            <el-icon><Plus /></el-icon> 添加
          </el-button>
          <el-button size="small" type="danger" plain @click="handleClear">
            <el-icon><Delete /></el-icon> 清空
          </el-button>
          <span class="file-count">{{ fileStore.files.length }} 个文件</span>
        </div>
        <div class="toolbar-right">
          <el-button
            type="primary"
            :disabled="!canExecute"
            @click="execute"
          >
            <el-icon><VideoPlay /></el-icon>
            执行
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Plus, Delete, VideoPlay } from "@element-plus/icons-vue";
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
  color: #909399;
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
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
}
</style>
