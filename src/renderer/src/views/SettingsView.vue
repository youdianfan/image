<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>{{ $t('settings.title') }}</h2>
      <p class="page-desc">{{ $t('settings.subtitle') }}</p>
    </div>

    <!-- AI Model Management -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.ai.title') }}</span>
      </template>
      <div class="ai-model-info">
        <div class="info-row">
          <span class="info-label">{{ $t('settings.ai.model') }}</span>
          <span class="info-value">{{ $t('settings.ai.modelName') }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('settings.ai.status') }}</span>
          <span class="info-value">
            <el-tag
              v-if="aiStore.modelStatus === 'ready'"
              type="success"
              size="small"
            >
              {{ $t('settings.ai.ready') }}
            </el-tag>
            <el-tag
              v-else-if="aiStore.modelStatus === 'loading'"
              size="small"
            >
              {{ $t('settings.ai.loading') }}
            </el-tag>
            <el-tag
              v-else-if="aiStore.modelStatus === 'error'"
              type="danger"
              size="small"
            >
              {{ $t('settings.ai.error') }}
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
            {{ $t('settings.ai.retry') }}
          </el-button>
          <span v-if="aiStore.modelStatus === 'ready'" class="ready-text">
            {{ $t('settings.ai.readyHint') }}
          </span>
        </div>

        <p class="ai-desc">
          {{ $t('settings.ai.description') }}
        </p>
      </div>
    </el-card>

    <!-- Auto Translate -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.autoTranslate.title') }}</span>
      </template>
      <div class="auto-translate-section">
        <div class="info-row">
          <span class="info-label">{{ $t('settings.autoTranslate.toggle') }}</span>
          <span class="info-value">
            <el-switch
              :model-value="settingsStore.autoTranslate"
              @change="onAutoTranslateChange"
            />
          </span>
        </div>
        <p class="ai-desc">
          {{ $t('settings.autoTranslate.description') }}
        </p>
      </div>
    </el-card>

    <!-- Naming Format -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.naming.title') }}</span>
      </template>
      <div class="naming-section">
        <div class="info-row">
          <span class="info-label">{{ $t('settings.naming.format') }}</span>
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
                :label="`${$t('format.' + f.format)} ${f.label} (${f.example})`"
                :value="f.format"
              />
            </el-select>
          </span>
        </div>
        <div class="format-preview">
          <span class="preview-label">{{ $t('settings.naming.example') }}</span>
          <span class="preview-before">{{ $t('settings.naming.exampleBefore') }}</span>
          <span class="preview-arrow">&rarr;</span>
          <code class="preview-after">{{ formatExample }}.jpg</code>
        </div>
        <p class="ai-desc">
          {{ $t('settings.naming.description') }}
        </p>
      </div>
    </el-card>

    <!-- Conflict Strategy -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.conflict.title') }}</span>
      </template>
      <div class="conflict-section">
        <el-radio-group
          :model-value="settingsStore.conflictStrategy"
          size="small"
          @change="onConflictStrategyChange"
        >
          <el-radio value="autoNumber">{{ $t('settings.conflict.autoNumber') }}</el-radio>
          <el-radio value="skip">{{ $t('settings.conflict.skip') }}</el-radio>
          <el-radio value="overwrite">{{ $t('settings.conflict.overwrite') }}</el-radio>
        </el-radio-group>
        <p class="ai-desc">
          {{ $t('settings.conflict.description') }}
        </p>
      </div>
    </el-card>

    <!-- Appearance -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.appearance.title') }}</span>
      </template>
      <div class="appearance-section">
        <div class="info-row">
          <span class="info-label">{{ $t('settings.appearance.theme') }}</span>
          <span class="info-value">
            <el-radio-group
              :model-value="themeStore.mode"
              size="small"
              @change="onThemeModeChange"
            >
              <el-radio value="light">{{ $t('settings.appearance.light') }}</el-radio>
              <el-radio value="dark">{{ $t('settings.appearance.dark') }}</el-radio>
              <el-radio value="system">{{ $t('settings.appearance.system') }}</el-radio>
            </el-radio-group>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('settings.appearance.primaryColor') }}</span>
          <span class="info-value">
            <div class="color-picker-row">
              <div
                v-for="color in presetColors"
                :key="color"
                class="color-swatch"
                :class="{ 'is-active': themeStore.primaryColor === color }"
                :style="{ background: color }"
                @click="themeStore.setPrimaryColor(color)"
              />
              <el-color-picker
                :model-value="themeStore.primaryColor"
                size="small"
                @change="onCustomColorChange"
              />
            </div>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('settings.appearance.language') }}</span>
          <span class="info-value">
            <el-select
              :model-value="currentLocale"
              size="small"
              style="width: 160px"
              @change="onLocaleChange"
            >
              <el-option
                v-for="opt in LOCALE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </span>
        </div>
      </div>
    </el-card>

    <!-- Version Update -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <span>{{ $t('settings.update.title') }}</span>
      </template>
      <div class="update-section">
        <div class="info-row">
          <span class="info-label">{{ $t('settings.update.currentVersion') }}</span>
          <span class="info-value">v{{ appVersion }}</span>
        </div>

        <div v-if="updateStore.latestVersion" class="info-row">
          <span class="info-label">{{ $t('settings.update.latestVersion') }}</span>
          <span class="info-value">v{{ updateStore.latestVersion }}</span>
        </div>

        <div class="update-actions">
          <!-- Idle / Up to date -->
          <template v-if="updateStore.status === 'idle'">
            <el-button size="small" type="primary" @click="updateStore.checkForUpdate()">
              {{ $t('settings.update.checkUpdate') }}
            </el-button>
          </template>

          <!-- Checking -->
          <template v-else-if="updateStore.status === 'checking'">
            <el-button size="small" loading disabled>
              {{ $t('settings.update.checking') }}
            </el-button>
          </template>

          <!-- Up to date -->
          <template v-else-if="updateStore.status === 'up-to-date'">
            <el-tag type="success" size="small">{{ $t('settings.update.upToDate') }}</el-tag>
            <el-button size="small" text @click="updateStore.reset()">
              {{ $t('settings.update.checkUpdate') }}
            </el-button>
          </template>

          <!-- Available -->
          <template v-else-if="updateStore.status === 'available'">
            <el-tag size="small">{{ $t('settings.update.newVersion', { version: updateStore.latestVersion }) }}</el-tag>
            <el-button size="small" type="primary" @click="updateStore.downloadUpdate()">
              {{ $t('settings.update.downloading').split(' ')[0] }}
            </el-button>
          </template>

          <!-- Downloading -->
          <template v-else-if="updateStore.status === 'downloading'">
            <span class="update-progress-text">{{ $t('settings.update.downloading', { progress: updateStore.downloadProgress }) }}</span>
            <el-progress
              :percentage="updateStore.downloadProgress"
              :stroke-width="10"
              :show-text="false"
              class="update-progress"
            />
          </template>

          <!-- Ready to install -->
          <template v-else-if="updateStore.status === 'ready'">
            <el-tag type="success" size="small">{{ $t('settings.update.readyToInstall') }}</el-tag>
            <el-button size="small" type="primary" @click="updateStore.installUpdate()">
              {{ $t('settings.update.install') }}
            </el-button>
          </template>

          <!-- Error -->
          <template v-else-if="updateStore.status === 'error'">
            <el-tag type="danger" size="small">{{ $t('settings.update.downloadFailed') }}</el-tag>
            <el-button size="small" @click="updateStore.checkForUpdate()">
              {{ $t('settings.update.retry') }}
            </el-button>
          </template>
        </div>
      </div>
    </el-card>

    <!-- About -->
    <el-card>
      <template #header>
        <span>{{ $t('settings.about.title') }}</span>
      </template>
      <p>Image Rename AI v{{ appVersion }}</p>
      <p class="about-desc">
        {{ $t('settings.about.description') }}
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAiStore } from "@/stores/ai.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import type { ConflictStrategy } from "@/stores/workspace.store";
import { useSettingsStore } from "@/stores/settings.store";
import { useThemeStore } from "@/stores/theme.store";
import { useUpdateStore } from "@/stores/update.store";
import type { ThemeMode } from "@/stores/theme.store";
import { ALL_FORMATS, convertName, type NameFormat } from "@/utils/nameConverter";
import { LOCALE_OPTIONS, saveLocale, type AppLocale } from "@/i18n";

const { locale: currentLocale } = useI18n();
const aiStore = useAiStore();
const workspaceStore = useWorkspaceStore();
const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const updateStore = useUpdateStore();
const appVersion = ref("1.0.0");

const presetColors = [
  "#409eff",
  "#67c23a",
  "#e6a23c",
  "#f56c6c",
  "#909399",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

const formatExample = computed(() => {
  return convertName("white cat", workspaceStore.rename.nameFormat);
});

function onAutoTranslateChange(val: string | number | boolean): void {
  settingsStore.setAutoTranslate(!!val);
}

function onConflictStrategyChange(val: string | number | boolean | undefined): void {
  if (val) settingsStore.setConflictStrategy(val as ConflictStrategy);
}

function onFormatChange(format: NameFormat): void {
  workspaceStore.updateRename({ nameFormat: format });
}

function onThemeModeChange(val: string | number | boolean | undefined): void {
  if (val) themeStore.setMode(val as ThemeMode);
}

function onCustomColorChange(color: string | null): void {
  if (color) themeStore.setPrimaryColor(color);
}

function onLocaleChange(val: AppLocale): void {
  currentLocale.value = val;
  saveLocale(val);
  // Notify main process for tray menu update
  window.api.setLocale(val);
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
  color: var(--app-text-primary);
  margin-bottom: 4px;
}

.page-desc {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.ai-model-info,
.auto-translate-section,
.naming-section,
.conflict-section,
.appearance-section,
.update-section {
  font-size: 14px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.info-label {
  width: 80px;
  color: var(--app-text-secondary);
  flex-shrink: 0;
}

.info-value {
  color: var(--app-text-primary);
}

.ai-actions {
  margin: 16px 0 12px;
}

.ready-text {
  color: var(--app-success);
  font-size: 13px;
}

.ai-desc {
  font-size: 12px;
  color: var(--app-text-placeholder);
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
  color: var(--app-text-secondary);
}

.preview-before {
  color: var(--app-text-regular);
}

.preview-arrow {
  color: var(--app-text-placeholder);
}

.preview-after {
  font-family: "Consolas", "Monaco", monospace;
  color: var(--app-primary);
  background: var(--app-primary-light);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.about-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

/* Color picker */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.is-active {
  border-color: var(--app-text-primary);
  box-shadow: 0 0 0 2px var(--app-bg);
}

/* Update section */
.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.update-progress {
  width: 200px;
}

.update-progress-text {
  font-size: 13px;
  color: var(--app-text-secondary);
  white-space: nowrap;
}
</style>
