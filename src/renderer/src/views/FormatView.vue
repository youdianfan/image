<template>
  <div class="format-view">
    <div class="page-header">
      <div class="header-left">
        <h2>命名格式转换</h2>
        <p class="page-desc">输入任意字符串，快速转换为多种命名格式</p>
      </div>
      <div class="header-right">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="single">单行</el-radio-button>
          <el-radio-button value="batch">批量</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- AI status tip -->
    <el-alert
      v-if="hasChinese && !aiStore.isReady"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        检测到中文输入。
        <router-link to="/settings" style="color: #409eff">前往设置下载 AI 模型</router-link>
        以启用智能中英翻译。
      </template>
    </el-alert>

    <!-- Single mode input -->
    <div v-if="mode === 'single'" class="input-section">
      <el-input
        v-model="singleInput"
        placeholder="输入文本，如：hello world、白色的猫、myVariableName"
        size="large"
        clearable
        @input="onSingleInputChange"
      />
    </div>

    <!-- Batch mode input -->
    <div v-if="mode === 'batch'" class="input-section">
      <el-input
        v-model="batchInput"
        type="textarea"
        :rows="4"
        placeholder="每行一个，批量转换"
        @input="onBatchInputChange"
      />
      <div class="batch-format-select">
        <span>输出格式：</span>
        <el-select v-model="batchFormat" size="small" style="width: 180px">
          <el-option
            v-for="f in ALL_FORMATS"
            :key="f.format"
            :label="f.label"
            :value="f.format"
          />
        </el-select>
      </div>
    </div>

    <!-- Single mode results -->
    <div v-if="mode === 'single' && singleInput.trim()" class="results-section">
      <div v-if="translating" class="translating-tip">
        <el-icon class="is-loading"><Loading /></el-icon>
        AI 翻译中...
      </div>
      <div class="format-grid">
        <div v-for="item in singleResults" :key="item.format" class="format-card">
          <div class="card-header">
            <span class="card-label">{{ item.label }}</span>
            <el-button
              size="small"
              text
              @click="copyToClipboard(item.value)"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </div>
          <div class="card-value">{{ item.value || "-" }}</div>
        </div>
      </div>
      <div class="copy-all">
        <el-button size="small" @click="copyAllFormats">
          <el-icon><CopyDocument /></el-icon>
          复制全部
        </el-button>
      </div>
    </div>

    <!-- Batch mode results -->
    <div v-if="mode === 'batch' && batchInput.trim()" class="results-section">
      <el-input
        :model-value="batchOutput"
        type="textarea"
        :rows="4"
        readonly
        placeholder="转换结果"
      />
      <div class="copy-all" style="margin-top: 8px">
        <el-button size="small" @click="copyToClipboard(batchOutput)">
          <el-icon><CopyDocument /></el-icon>
          复制结果
        </el-button>
      </div>
    </div>

    <!-- History -->
    <div v-if="history.length > 0" class="history-section">
      <div class="history-header">
        <span class="history-title">历史记录</span>
        <el-button size="small" text @click="clearHistory">清空</el-button>
      </div>
      <div class="history-list">
        <el-tag
          v-for="(item, index) in history"
          :key="index"
          size="small"
          class="history-tag"
          @click="fillFromHistory(item)"
        >
          {{ item }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { CopyDocument, Loading } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import {
  ALL_FORMATS,
  convertAll,
  convertAllAsync,
  convertName,
  containsChinese,
  type NameFormat,
} from "@/utils/nameConverter";
import { useAiStore } from "@/stores/ai.store";

const aiStore = useAiStore();

const mode = ref<"single" | "batch">("single");
const singleInput = ref("");
const batchInput = ref("");
const batchFormat = ref<NameFormat>("kebab-case");
const translating = ref(false);

// Single mode results
const syncResults = ref<Record<string, string>>({});
const asyncResults = ref<Record<string, string>>({});

const singleResults = computed(() => {
  const results = Object.keys(asyncResults.value).length > 0
    ? asyncResults.value
    : syncResults.value;
  return ALL_FORMATS.map((f) => ({
    format: f.format,
    label: f.label,
    value: results[f.format] || "",
  }));
});

const hasChinese = computed(() => containsChinese(singleInput.value));

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function onSingleInputChange(): void {
  // Immediate sync result
  const input = singleInput.value.trim();
  if (!input) {
    syncResults.value = {};
    asyncResults.value = {};
    return;
  }

  syncResults.value = convertAll(input);
  asyncResults.value = {};

  // If contains Chinese and AI ready, do async translation
  if (containsChinese(input) && aiStore.isReady) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      translating.value = true;
      try {
        asyncResults.value = await convertAllAsync(input);
      } finally {
        translating.value = false;
      }
    }, 300);
  }

  addToHistory(input);
}

// Batch mode
const batchOutput = computed(() => {
  const lines = batchInput.value.split("\n");
  return lines
    .map((line) => (line.trim() ? convertName(line, batchFormat.value) : ""))
    .join("\n");
});

function onBatchInputChange(): void {
  const input = batchInput.value.trim();
  if (input) {
    addToHistory(input.split("\n")[0]);
  }
}

// Copy
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

function copyAllFormats(): void {
  const text = singleResults.value
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");
  copyToClipboard(text);
}

// History
const HISTORY_KEY = "format-history";
const MAX_HISTORY = 20;
const history = ref<string[]>(loadHistory());

function loadHistory(): string[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveHistory(): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

function addToHistory(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) return;
  history.value = [trimmed, ...history.value.filter((h) => h !== trimmed)].slice(
    0,
    MAX_HISTORY,
  );
  saveHistory();
}

function fillFromHistory(item: string): void {
  if (mode.value === "single") {
    singleInput.value = item;
    onSingleInputChange();
  } else {
    batchInput.value = item;
  }
}

function clearHistory(): void {
  history.value = [];
  saveHistory();
}

// Watch batch format change
watch(batchFormat, () => {
  // Batch output is computed, auto-updates
});
</script>

<style scoped>
.format-view {
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
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

.input-section {
  margin-bottom: 20px;
}

.batch-format-select {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.results-section {
  margin-bottom: 20px;
}

.translating-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #409eff;
  margin-bottom: 12px;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.format-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.card-value {
  font-size: 15px;
  color: #303133;
  font-family: "Consolas", "Monaco", monospace;
  word-break: break-all;
  min-height: 22px;
}

.copy-all {
  margin-top: 12px;
  text-align: right;
}

.history-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.history-title {
  font-size: 13px;
  color: #909399;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.history-tag {
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-tag:hover {
  color: #409eff;
  border-color: #409eff;
}
</style>
