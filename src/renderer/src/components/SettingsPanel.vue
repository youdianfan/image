<template>
  <div class="settings-panel">
    <!-- Rename Section -->
    <div class="section">
      <div class="section-header">
        <el-switch v-model="store.rename.enabled" size="small" />
        <span class="section-title">重命名</span>
      </div>
      <div v-if="store.rename.enabled" class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item label="命名模板">
            <el-input
              ref="templateInputRef"
              v-model="store.rename.template"
              placeholder="{original}-{index}"
            />
            <div class="variable-tags">
              <el-tag
                v-for="v in variables"
                :key="v.name"
                size="small"
                type="info"
                class="var-tag"
                @click="insertVariable(v.name)"
              >
                {{ v.label }}
              </el-tag>
            </div>
          </el-form-item>

          <el-form-item label="序号">
            <div class="index-row">
              <div class="index-field">
                <label>起始</label>
                <el-input-number
                  v-model="store.rename.startIndex"
                  :min="0"
                  controls-position="right"
                  size="small"
                />
              </div>
              <div class="index-field">
                <label>步长</label>
                <el-input-number
                  v-model="store.rename.indexStep"
                  :min="1"
                  controls-position="right"
                  size="small"
                />
              </div>
              <div class="index-field">
                <label>位数</label>
                <el-input-number
                  v-model="store.rename.indexDigits"
                  :min="1"
                  :max="10"
                  controls-position="right"
                  size="small"
                />
              </div>
            </div>
          </el-form-item>

          <el-form-item label="冲突处理">
            <el-radio-group v-model="store.rename.conflictStrategy" size="small">
              <el-radio value="autoNumber">自动编号</el-radio>
              <el-radio value="skip">跳过</el-radio>
              <el-radio value="overwrite">覆盖</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Compress Section -->
    <div class="section">
      <div class="section-header">
        <el-switch v-model="store.compress.enabled" size="small" />
        <span class="section-title">压缩</span>
      </div>
      <div v-if="store.compress.enabled" class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item label="质量">
            <el-slider
              v-model="store.compress.quality"
              :min="1"
              :max="100"
              show-input
              input-size="small"
            />
          </el-form-item>

          <el-form-item label="缩放">
            <el-slider
              v-model="store.compress.scale"
              :min="10"
              :max="100"
              :step="5"
              :format-tooltip="(v: number) => `${v}%`"
              show-input
              input-size="small"
            />
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="store.compress.stripExif">
              去除 EXIF 信息
            </el-checkbox>
          </el-form-item>

          <el-form-item label="输出格式">
            <el-radio-group v-model="store.compress.outputFormat" size="small">
              <el-radio value="original">保持原格式</el-radio>
              <el-radio value="jpg">JPG</el-radio>
              <el-radio value="webp">WebP</el-radio>
              <el-radio value="png">PNG</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Output Section -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">输出</span>
      </div>
      <div class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item>
            <el-radio-group v-model="store.output.mode" size="small">
              <el-radio value="newDirectory">输出到新目录</el-radio>
              <el-radio value="overwrite">覆盖原文件</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="store.output.mode === 'newDirectory'">
            <el-input
              v-model="store.output.directory"
              placeholder="点击选择输出目录"
              readonly
              size="small"
            >
              <template #append>
                <el-button @click="selectOutputDir">
                  <el-icon><FolderOpened /></el-icon>
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { FolderOpened } from "@element-plus/icons-vue";
import { useWorkspaceStore } from "@/stores/workspace.store";

const store = useWorkspaceStore();

const templateInputRef = ref<{ input?: HTMLInputElement }>();

const variables = [
  { name: "original", label: "{original}" },
  { name: "index", label: "{index}" },
  { name: "date", label: "{date}" },
];

function insertVariable(varName: string): void {
  const el = templateInputRef.value?.input;
  if (el) {
    const start = el.selectionStart ?? store.rename.template.length;
    const end = el.selectionEnd ?? start;
    const text = store.rename.template;
    store.rename.template =
      text.slice(0, start) + `{${varName}}` + text.slice(end);
  } else {
    store.rename.template += `{${varName}}`;
  }
}

async function selectOutputDir(): Promise<void> {
  try {
    const dir = await window.api.selectDirectory();
    if (dir) {
      store.output.directory = dir;
    }
  } catch {
    // User cancelled
  }
}
</script>

<style scoped>
.settings-panel {
  padding: 12px 16px;
  height: 100%;
  overflow-y: auto;
}

.section {
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.section-body {
  padding: 12px;
}

.variable-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.var-tag {
  cursor: pointer;
  user-select: none;
}

.var-tag:hover {
  color: #409eff;
  border-color: #409eff;
}

.index-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.index-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.index-field label {
  font-size: 11px;
  color: #909399;
}

.index-field .el-input-number {
  width: 100%;
}
</style>
