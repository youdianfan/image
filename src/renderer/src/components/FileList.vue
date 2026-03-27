<template>
  <div class="file-list">
    <el-table
      :data="items"
      stripe
      size="small"
      :max-height="maxHeight"
      :empty-text="$t('fileList.empty')"
      style="width: 100%"
    >
      <el-table-column type="selection" width="40" />

      <el-table-column type="index" label="#" width="50" />

      <el-table-column :label="$t('fileList.preview')" width="70" align="center">
        <template #default="{ row, $index }">
          <el-image
            :src="row.imageUrl"
            fit="cover"
            class="thumb"
            lazy
            @click="openViewer($index)"
          >
            <template #error>
              <div class="thumb-error">
                <el-icon><PictureFilled /></el-icon>
              </div>
            </template>
          </el-image>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.originalName')" min-width="180">
        <template #default="{ row }">
          <el-tooltip
            :content="row.originalPath"
            placement="top"
            :show-after="500"
          >
            <span class="filename">{{ row.originalName }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.newName')" min-width="180">
        <template #default="{ row }">
          <div class="new-name-cell">
            <template v-if="editingId === row.id">
              <el-input
                v-model="editValue"
                size="small"
                autofocus
                @blur="confirmEdit(row.id)"
                @keyup.enter="confirmEdit(row.id)"
                @keyup.escape="cancelEdit"
              />
            </template>
            <template v-else>
              <span
                class="new-name"
                :class="{ 'has-conflict': row.hasConflict }"
                @click="startEdit(row)"
              >
                {{ row.newName }}
              </span>
              <el-tooltip
                v-if="row.hasConflict"
                :content="$t('fileList.conflictHint')"
                placement="top"
              >
                <el-icon class="conflict-icon"><WarningFilled /></el-icon>
              </el-tooltip>
            </template>
          </div>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.originalSize')" width="90" align="right">
        <template #default="{ row }">
          <span class="file-size">{{ row.sizeText }}</span>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.compressedSize')" width="100" align="right">
        <template #default="{ row }">
          <span class="compressed-size" :class="{ 'has-value': row.compressedSizeText !== '--' }">
            {{ row.compressedSizeText }}
          </span>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.status')" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small" round>
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.actions')" width="80" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.status === 'processing' ? 'primary' : 'default'"
            :loading="row.status === 'processing'"
            :disabled="isTaskRunning"
            @click="$emit('compress', row.id)"
          >
            {{ row.status === 'processing' ? $t('fileList.compressing') : $t('fileList.compress') }}
          </el-button>
        </template>
      </el-table-column>

      <el-table-column :label="$t('fileList.delete')" width="60" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            link
            @click="$emit('remove', row.id)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-image-viewer
      v-if="viewerVisible"
      :url-list="imageUrlList"
      :initial-index="viewerInitialIndex"
      teleported
      @close="viewerVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { WarningFilled, Delete, PictureFilled } from "@element-plus/icons-vue";
import { ElImageViewer } from "element-plus";

export interface FileListItem {
  id: string;
  originalName: string;
  originalPath: string;
  imageUrl: string;
  newName: string;
  sizeText: string;
  compressedSizeText: string;
  status: string;
  hasConflict: boolean;
}

const { t } = useI18n();

const props = defineProps<{
  items: FileListItem[];
  maxHeight?: number;
  isTaskRunning?: boolean;
}>();

const emit = defineEmits<{
  remove: [id: string];
  editName: [id: string, newName: string];
  compress: [id: string];
}>();

// Image viewer state
const viewerVisible = ref(false);
const viewerInitialIndex = ref(0);
const imageUrlList = computed(() => props.items.map((item) => item.imageUrl));

function openViewer(index: number): void {
  viewerInitialIndex.value = index;
  viewerVisible.value = true;
}

// Inline editing state
const editingId = ref<string | null>(null);
const editValue = ref("");

function startEdit(row: FileListItem): void {
  editingId.value = row.id;
  editValue.value = row.newName;
}

function confirmEdit(id: string): void {
  if (editValue.value.trim()) {
    emit("editName", id, editValue.value.trim());
  }
  editingId.value = null;
}

function cancelEdit(): void {
  editingId.value = null;
}

function statusTagType(
  status: string,
): "success" | "warning" | "danger" | "info" | "primary" | undefined {
  switch (status) {
    case "done":
      return "success";
    case "processing":
      return undefined;
    case "error":
      return "danger";
    default:
      return "info";
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t("fileList.statusPending"),
    processing: t("fileList.statusProcessing"),
    done: t("fileList.statusDone"),
    error: t("fileList.statusError"),
  };
  return map[status] || status;
}
</script>

<style scoped>
.file-list {
  flex: 1;
  overflow: hidden;
}

.filename {
  font-size: 13px;
  color: var(--app-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.new-name-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.new-name {
  font-size: 13px;
  color: var(--app-primary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-name:hover {
  text-decoration: underline;
}

.new-name.has-conflict {
  color: var(--app-warning);
}

.conflict-icon {
  color: var(--app-warning);
  font-size: 14px;
  flex-shrink: 0;
}

.file-size {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.compressed-size {
  font-size: 12px;
  color: var(--app-text-placeholder);
}

.compressed-size.has-value {
  color: var(--app-success);
  font-weight: 500;
}

.thumb {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.15s;
}

.thumb:hover {
  transform: scale(1.1);
}

.thumb-error {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg-secondary);
  border-radius: 4px;
  color: var(--app-text-placeholder);
  font-size: 20px;
}
</style>
