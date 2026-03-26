<template>
  <div class="rename-view">
    <div class="page-header">
      <h2>批量重命名</h2>
      <p class="page-desc">导入图片文件，设置命名规则，批量重命名</p>
    </div>
    <el-empty description="拖拽图片到此处，或点击下方按钮导入">
      <el-button type="primary" @click="handleImport">选择文件</el-button>
      <el-button @click="handleImportFolder">选择文件夹</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { useFileStore } from '@/stores/file.store'

const fileStore = useFileStore()

const handleImport = (): void => {
  fileStore.importFiles()
}

const handleImportFolder = (): void => {
  fileStore.importFolder()
}
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.page-desc {
  font-size: 13px;
  color: #909399;
}
</style>
