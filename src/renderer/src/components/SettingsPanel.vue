<template>
  <div class="settings-panel">
    <!-- Rename Section -->
    <div class="section" :class="{ 'is-disabled': !store.rename.enabled }">
      <div
        class="section-header"
        @click="store.rename.enabled = !store.rename.enabled"
      >
        <div class="section-header-left">
          <el-icon class="section-icon"><EditPen /></el-icon>
          <span class="section-title">{{ $t("panel.rename.title") }}</span>
        </div>
        <el-switch v-model="store.rename.enabled" size="small" @click.stop />
      </div>
      <div v-if="store.rename.enabled" class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item :label="$t('panel.rename.template')">
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

          <div class="compact-row">
            <el-form-item class="compact-field">
              <template #label>
                <span class="compact-label">{{
                  $t("panel.rename.startIndex")
                }}</span>
              </template>
              <el-input-number
                v-model="store.rename.startIndex"
                :min="0"
                controls-position="right"
                size="small"
              />
            </el-form-item>
            <el-form-item class="compact-field">
              <template #label>
                <span class="compact-label">{{ $t("panel.rename.step") }}</span>
              </template>
              <el-input-number
                v-model="store.rename.indexStep"
                :min="1"
                controls-position="right"
                size="small"
              />
            </el-form-item>
            <el-form-item class="compact-field">
              <template #label>
                <span class="compact-label">{{
                  $t("panel.rename.digits")
                }}</span>
              </template>
              <el-input-number
                v-model="store.rename.indexDigits"
                :min="1"
                :max="10"
                controls-position="right"
                size="small"
              />
            </el-form-item>
          </div>

        </el-form>
      </div>
    </div>

    <!-- Compress Section -->
    <div class="section" :class="{ 'is-disabled': !store.compress.enabled }">
      <div
        class="section-header"
        @click="store.compress.enabled = !store.compress.enabled"
      >
        <div class="section-header-left">
          <el-icon class="section-icon"><PictureFilled /></el-icon>
          <span class="section-title">{{ $t("panel.compress.title") }}</span>
        </div>
        <el-switch v-model="store.compress.enabled" size="small" @click.stop />
      </div>
      <div v-if="store.compress.enabled" class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item :label="$t('panel.compress.quality')">
            <el-slider
              v-model="store.compress.quality"
              :min="1"
              :max="100"
              show-input
              input-size="small"
            />
          </el-form-item>

          <el-form-item :label="$t('panel.compress.scale')">
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
              {{ $t("panel.compress.stripExif") }}
            </el-checkbox>
          </el-form-item>

          <el-form-item :label="$t('panel.compress.outputFormat')">
            <el-radio-group v-model="store.compress.outputFormat" size="small">
              <el-radio value="webp">WebP</el-radio>
              <el-radio value="jpg">JPG</el-radio>
              <el-radio value="png">PNG</el-radio>
              <el-radio value="original">{{
                $t("panel.compress.keepOriginal")
              }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Output Section -->
    <div class="section">
      <div class="section-header section-header-static">
        <div class="section-header-left">
          <el-icon class="section-icon"><Folder /></el-icon>
          <span class="section-title">{{ $t("panel.output.title") }}</span>
        </div>
        <el-button
          class="open-dir-btn"
          size="small"
          @click="$emit('openOutputDir')"
        >
          <el-icon><FolderOpened /></el-icon>
          <span>{{ $t("workspace.openOutputDir") }}</span>
        </el-button>
      </div>
      <div class="section-body">
        <el-form label-position="top" size="small">
          <el-form-item>
            <el-radio-group
              v-model="store.output.mode"
              size="small"
              class="output-mode-group"
            >
              <el-radio value="autoDirectory">{{
                $t("panel.output.autoDirectory")
              }}</el-radio>
              <el-radio value="customDirectory">{{
                $t("panel.output.customDirectory")
              }}</el-radio>
              <el-radio value="overwrite">{{
                $t("panel.output.overwrite")
              }}</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="store.output.mode === 'autoDirectory'">
            <div class="auto-dir-hint">
              <el-icon><InfoFilled /></el-icon>
              <span>{{ $t("panel.output.autoHint") }}</span>
            </div>
          </el-form-item>

          <el-form-item v-if="store.output.mode === 'customDirectory'">
            <el-input
              v-model="store.output.directory"
              :placeholder="$t('panel.output.selectDir')"
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
import {
  FolderOpened,
  Folder,
  EditPen,
  PictureFilled,
  InfoFilled,
} from "@element-plus/icons-vue";
import { useWorkspaceStore } from "@/stores/workspace.store";

defineEmits<{
  openOutputDir: [];
}>();

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
  padding: 8px 12px;
  height: 100%;
  overflow-y: auto;
}

.section {
  margin-bottom: 12px;
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  overflow: hidden;
  transition: opacity 0.2s;
}

.section.is-disabled {
  opacity: 0.6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--app-bg-tertiary);
  border-bottom: 1px solid var(--app-border-light);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.section-header:hover {
  background: var(--app-bg-secondary);
}

.section-header-static {
  cursor: default;
}

.section-header-static:hover {
  background: var(--app-bg-tertiary);
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 15px;
  color: var(--app-primary);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.section-body {
  padding: 10px 12px;
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
  color: var(--app-primary);
  border-color: var(--app-primary);
}

.compact-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.compact-row .compact-field {
  flex: 1;
  margin-bottom: 0;
}

.compact-label {
  font-size: 11px;
  color: var(--app-text-secondary);
}

.compact-row .el-input-number {
  width: 100%;
}

.output-mode-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.open-dir-btn {
  font-size: 12px;
  padding: 4px 10px;
  gap: 4px;
}

.auto-dir-hint {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.auto-dir-hint .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
</style>
