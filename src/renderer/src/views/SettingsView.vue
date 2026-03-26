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
          <span class="info-label">大小</span>
          <span class="info-value">~300MB（首次下载后缓存到本地）</span>
        </div>
        <div class="info-row">
          <span class="info-label">下载源</span>
          <span class="info-value">
            <el-select
              :model-value="aiStore.mirrorUrl"
              size="small"
              style="width: 280px"
              :disabled="aiStore.isDownloading"
              @change="aiStore.setMirrorUrl"
            >
              <el-option
                v-for="opt in mirrorOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">状态</span>
          <span class="info-value">
            <el-tag v-if="aiStore.modelStatus === 'ready'" type="success" size="small">
              已就绪
            </el-tag>
            <el-tag v-else-if="aiStore.modelStatus === 'downloading'" size="small">
              下载中 {{ aiStore.downloadProgress }}%
            </el-tag>
            <el-tag v-else-if="aiStore.modelStatus === 'error'" type="danger" size="small">
              错误
            </el-tag>
            <el-tag v-else type="info" size="small">
              未下载
            </el-tag>
          </span>
        </div>

        <el-progress
          v-if="aiStore.isDownloading"
          :percentage="aiStore.downloadProgress"
          :stroke-width="8"
          style="margin: 12px 0"
        />

        <el-alert
          v-if="aiStore.modelStatus === 'error'"
          type="error"
          :title="aiStore.errorMessage"
          :closable="false"
          style="margin: 8px 0"
        />

        <div class="ai-actions">
          <el-button
            v-if="aiStore.modelStatus === 'not-downloaded' || aiStore.modelStatus === 'error'"
            type="primary"
            :loading="aiStore.isDownloading"
            @click="downloadModel"
          >
            下载模型
          </el-button>
          <el-button
            v-if="aiStore.isDownloading"
            disabled
          >
            正在下载...
          </el-button>
          <span v-if="aiStore.modelStatus === 'ready'" class="ready-text">
            AI 翻译已启用，可在格式转换和批量重命名中使用
          </span>
        </div>

        <p class="ai-desc">
          下载后可启用中文→英文智能翻译，用于图片命名和格式转换。
          模型运行在本地浏览器端，无需联网即可使用。
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
import { MIRROR_OPTIONS } from "@/services/aiTranslator";

const aiStore = useAiStore();
const mirrorOptions = MIRROR_OPTIONS;
const appVersion = ref("1.0.0");

onMounted(async () => {
  try {
    appVersion.value = await window.api.getAppVersion();
  } catch {
    // fallback
  }
  aiStore.syncStatus();
});

async function downloadModel(): Promise<void> {
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
