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
            AI 翻译已启用，导入中文图片时自动翻译为英文命名
          </span>
        </div>

        <p class="ai-desc">
          翻译模型已内置，无需联网下载。模型运行在本地，无需联网即可使用。
        </p>
      </div>
    </el-card>

    <!-- Naming Format -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>命名规则</span>
      </template>
      <div class="naming-section">
        <div class="info-row">
          <span class="info-label">格式</span>
          <span class="info-value">
            <el-select
              :model-value="workspaceStore.rename.nameFormat"
              size="small"
              style="width: 220px"
              @change="onFormatChange"
            >
              <el-option
                v-for="f in ALL_FORMATS"
                :key="f.format"
                :label="`${f.desc} ${f.label} (${f.example})`"
                :value="f.format"
              />
            </el-select>
          </span>
        </div>
        <div class="format-preview">
          <span class="preview-label">示例：</span>
          <span class="preview-before">白色的猫.jpg</span>
          <span class="preview-arrow">&rarr;</span>
          <code class="preview-after">{{ formatExample }}.jpg</code>
        </div>
        <p class="ai-desc">
          中文图片导入时，AI 翻译后将按此格式生成英文文件名。
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
import { ref, computed, onMounted } from "vue";
import { useAiStore } from "@/stores/ai.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { ALL_FORMATS, convertName, type NameFormat } from "@/utils/nameConverter";

const aiStore = useAiStore();
const workspaceStore = useWorkspaceStore();
const appVersion = ref("1.0.0");

const formatExample = computed(() => {
  return convertName("white cat", workspaceStore.rename.nameFormat);
});

function onFormatChange(format: NameFormat): void {
  workspaceStore.updateRename({ nameFormat: format });
}

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

.ai-model-info,
.naming-section {
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

.format-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 8px;
  font-size: 13px;
}

.preview-label {
  color: #909399;
}

.preview-before {
  color: #606266;
}

.preview-arrow {
  color: #c0c4cc;
}

.preview-after {
  font-family: "Consolas", "Monaco", monospace;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.about-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
