<template>
  <div class="config-bar">
    <!-- Rename Chip -->
    <el-popover
      :visible="activePopover === 'rename'"
      placement="bottom-start"
      :width="360"
      :show-arrow="true"
    >
      <template #reference>
        <button
          class="config-chip"
          :class="{ 'is-active': store.rename.enabled }"
          @click="togglePopover('rename')"
        >
          <el-icon><EditPen /></el-icon>
          <span>{{ $t("panel.rename.title") }}</span>
          <el-icon class="chip-arrow" :class="{ 'is-open': activePopover === 'rename' }">
            <ArrowDown />
          </el-icon>
        </button>
      </template>

      <!-- Rename Popover Content -->
      <div class="popover-content">
        <div class="popover-header">
          <span class="popover-title">{{ $t("panel.rename.title") }}</span>
          <el-switch v-model="store.rename.enabled" size="small" />
        </div>
        <div v-if="store.rename.enabled" class="popover-body">
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
                  <span class="compact-label">{{ $t("panel.rename.startIndex") }}</span>
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
                  <span class="compact-label">{{ $t("panel.rename.digits") }}</span>
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
    </el-popover>

    <!-- Compress Chip -->
    <el-popover
      :visible="activePopover === 'compress'"
      placement="bottom-start"
      :width="400"
      :show-arrow="true"
    >
      <template #reference>
        <button
          class="config-chip"
          :class="{ 'is-active': store.compress.enabled }"
          @click="togglePopover('compress')"
        >
          <el-icon><PictureFilled /></el-icon>
          <span>{{ $t("panel.compress.title") }}</span>
          <span v-if="store.compress.enabled" class="chip-badge">
            {{ store.compress.quality }}%
            · {{ store.compress.outputFormat === 'original' ? $t('panel.compress.keepOriginal') : store.compress.outputFormat.toUpperCase() }}
          </span>
          <el-icon class="chip-arrow" :class="{ 'is-open': activePopover === 'compress' }">
            <ArrowDown />
          </el-icon>
        </button>
      </template>

      <!-- Compress Popover Content -->
      <div class="popover-content">
        <div class="popover-header">
          <span class="popover-title">{{ $t("panel.compress.title") }}</span>
          <el-switch v-model="store.compress.enabled" size="small" />
        </div>
        <div v-if="store.compress.enabled" class="popover-body">
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
                <el-radio value="original">{{ $t("panel.compress.keepOriginal") }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-popover>

    <!-- Output Chip -->
    <el-popover
      :visible="activePopover === 'output'"
      placement="bottom-start"
      :width="360"
      :show-arrow="true"
    >
      <template #reference>
        <button
          class="config-chip"
          @click="togglePopover('output')"
        >
          <el-icon><Folder /></el-icon>
          <span>{{ $t("panel.output.title") }}</span>
          <span class="chip-badge">{{ outputModeLabel }}</span>
          <el-icon class="chip-arrow" :class="{ 'is-open': activePopover === 'output' }">
            <ArrowDown />
          </el-icon>
        </button>
      </template>

      <!-- Output Popover Content -->
      <div class="popover-content">
        <div class="popover-header">
          <span class="popover-title">{{ $t("panel.output.title") }}</span>
        </div>
        <div class="popover-body">
          <el-form label-position="top" size="small">
            <el-form-item>
              <el-radio-group
                v-model="store.output.mode"
                size="small"
                class="output-mode-group"
              >
                <el-radio value="autoDirectory">{{ $t("panel.output.autoDirectory") }}</el-radio>
                <el-radio value="customDirectory">{{ $t("panel.output.customDirectory") }}</el-radio>
                <el-radio value="overwrite">{{ $t("panel.output.overwrite") }}</el-radio>
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
    </el-popover>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  EditPen,
  PictureFilled,
  Folder,
  FolderOpened,
  InfoFilled,
  ArrowDown,
} from "@element-plus/icons-vue";
import { useWorkspaceStore } from "@/stores/workspace.store";

const { t } = useI18n();
const store = useWorkspaceStore();

// Popover state - only one open at a time
type PopoverName = "rename" | "compress" | "output";
const activePopover = ref<PopoverName | null>(null);

function togglePopover(name: PopoverName): void {
  activePopover.value = activePopover.value === name ? null : name;
}

function handleClickOutside(e: MouseEvent): void {
  if (!activePopover.value) return;
  const target = e.target as HTMLElement;
  // Close if click is outside any popover or chip
  if (!target.closest(".config-chip") && !target.closest(".el-popover")) {
    activePopover.value = null;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside, true);
});

// Output mode label for chip display
const outputModeLabel = computed(() => {
  const mode = store.output.mode;
  if (mode === "autoDirectory") return t("panel.output.autoDirectory");
  if (mode === "customDirectory") return t("panel.output.customDirectory");
  return t("panel.output.overwrite");
});

// Rename template variables
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
    store.rename.template = text.slice(0, start) + `{${varName}}` + text.slice(end);
  } else {
    store.rename.template += `{${varName}}`;
  }
}

// Output directory selection
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
.config-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 0;
  flex-shrink: 0;
}

.config-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--app-border-light);
  border-radius: 20px;
  background: var(--app-bg-secondary);
  color: var(--app-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  outline: none;
}

.config-chip:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  background: var(--app-bg-tertiary);
}

.config-chip.is-active {
  background: var(--app-primary-light);
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.config-chip .el-icon {
  font-size: 14px;
}

.chip-badge {
  font-size: 11px;
  color: var(--app-text-secondary);
  opacity: 0.8;
  margin-left: 2px;
}

.config-chip.is-active .chip-badge {
  color: var(--app-primary);
  opacity: 0.7;
}

.chip-arrow {
  font-size: 12px;
  transition: transform 0.2s;
  margin-left: -2px;
}

.chip-arrow.is-open {
  transform: rotate(180deg);
}

/* Popover Content */
.popover-content {
  margin: -12px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--app-border-light);
  background: var(--app-bg-tertiary);
  border-radius: 4px 4px 0 0;
}

.popover-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.popover-body {
  padding: 12px 16px;
}

/* Rename section */
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

.compact-row :deep(.el-input-number) {
  width: 100%;
}

/* Output section */
.output-mode-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px 16px;
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
