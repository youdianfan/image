<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>设置</h2>
      <p class="page-desc">应用偏好设置</p>
    </div>
    <el-card>
      <template #header>
        <span>关于</span>
      </template>
      <p>Image Rename AI v{{ appVersion }}</p>
      <p class="about-desc">一款支持批量图片重命名、命名格式转换、图片压缩转码的桌面工具</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const appVersion = ref('1.0.0')

onMounted(async () => {
  try {
    appVersion.value = await window.api.getAppVersion()
  } catch {
    // fallback
  }
})
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
.about-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
