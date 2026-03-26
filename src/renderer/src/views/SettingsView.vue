<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>设置</h2>
      <p class="page-desc">应用偏好设置</p>
    </div>

    <!-- AI Model Management -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>AI 模型管理</span>
      </template>
      <div class="ai-model-info">
        <div class="info-row">
          <span class="info-label">模型</span>
          <span class="info-value">Helsinki-NLP/opus-mt-zh-en (中→英翻译)</span>
        </div>
        <div class="info-row">
          <span class="info-label">状态</span>
          <span class="info-value">
            <el-tag
              v-if="aiStore.modelStatus === 'ready'"
              type="success"
              size="small"
            >
              已就绪
            </el-tag>
            <el-tag
              v-else-if="aiStore.modelStatus === 'loading'"
              size="small"
            >
              加载中...
            </el-tag>
            <el-tag
              v-else-if="aiStore.modelStatus === 'error'"
              type="danger"
              size="small"
            >
              加载失败
            </el-tag>
          </span>
        </div>

        <el-alert
          v-if="aiStore.modelStatus === 'error'"
          type="error"
          :title="aiStore.errorMessage"
          :closable="false"
          style="margin: 8px 0"
        />

        <div class="ai-actions">
          <el-button
            v-if="aiStore.modelStatus === 'error'"
            type="primary"
            :loading="aiStore.isLoading"
            @click="retryLoad"
          >
            重新加载
          </el-button>
          <span v-if="aiStore.modelStatus === 'ready'" class="ready-text">
            AI 翻译已启用，可在格式转换和批量重命名中使用
          </span>
        </div>

        <p class="ai-desc">
          翻译模型已内置，无需联网下载。模型运行在本地，无需联网即可使用。
        </p>
      </div>
    </el-card>

    <!-- About -->
    <el-card>
      <template #header>
        <span>关于</span>
      </template>
      <p>Image Rename AI v{{ appVersion }}</p>
      <p class="about-desc">
        一款支持批量图片重命名、命名格式转换、图片压缩转码的桌面工具
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAiStore } from "@/stores/ai.store";

const aiStore = useAiStore();
const appVersion = ref("1.0.0");

onMounted(async () => {
  try {
    appVersion.value = await window.api.getAppVersion();
  } catch {
    // fallback
  }
  aiStore.syncStatus();
});

async function retryLoad(): Promise<void> {
  await aiStore.loadModel();
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

.ai-model-info {
  font-size: 14px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.info-label {
  width: 60px;
  color: #909399;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
}

.ai-actions {
  margin: 16px 0 12px;
}

.ready-text {
  color: #67c23a;
  font-size: 13px;
}

.ai-desc {
  font-size: 12px;
  color: #c0c4cc;
  line-height: 1.6;
}

.about-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
