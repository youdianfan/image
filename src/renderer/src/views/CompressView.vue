<template>
  <div class="compress-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>图片压缩</h2>
        <p class="page-desc">批量压缩图片，支持格式转换和质量调节</p>
      </div>
      <div v-if="files.length > 0" class="header-actions">
        <el-button type="primary" :disabled="!canExecute" :loading="isCompressing" @click="executeCompress">
          <el-icon><Download /></el-icon>
          开始压缩
        </el-button>
      </div>
    </div>

    <!-- Empty state -->
    <template v-if="files.length === 0">
      <div
        class="import-area"
        :class="{ 'is-dragover': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
      >
        <el-icon class="import-icon" :size="48"><PictureFilled /></el-icon>
        <p class="import-text">拖拽图片到此处</p>
        <p class="import-hint">支持 PNG / JPG / JPEG / WEBP / GIF</p>
        <div class="import-actions">
          <el-button type="primary" @click="handleImportFiles">选择文件</el-button>
          <el-button @click="handleImportFolder">选择文件夹</el-button>
        </div>
      </div>
    </template>

    <!-- Working state -->
    <template v-else>
      <div class="compress-body">
        <!-- File list + settings -->
        <div class="compress-main">
          <!-- Compact import bar -->
          <div class="compact-bar">
            <span class="file-count"><el-icon><PictureFilled /></el-icon> {{ files.length }} 个文件</span>
            <div class="compact-actions">
              <el-button size="small" @click="handleImportFiles">添加文件</el-button>
              <el-button size="small" type="danger" plain @click="clearFiles">清空</el-button>
            </div>
          </div>

          <!-- File table -->
          <el-table :data="files" stripe size="small" :max-height="tableMaxHeight" style="width: 100%">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column label="文件名" min-width="200">
              <template #default="{ row }">
                <span class="filename">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="原始大小" width="100" align="right">
              <template #default="{ row }">
                <span class="size-text">{{ formatSize(row.size) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="压缩后" width="100" align="right">
              <template #default="{ row }">
                <span v-if="row.compressedSize != null" class="size-text compressed">
                  {{ formatSize(row.compressedSize) }}
                </span>
                <span v-else class="size-text">-</span>
              </template>
            </el-table-column>
            <el-table-column label="压缩率" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.compressedSize != null" :type="ratioTagType(row.size, row.compressedSize)" size="small" round>
                  {{ compressionRatio(row.size, row.compressedSize) }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small" round>
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column width="50" align="center">
              <template #default="{ row }">
                <el-button type="danger" :icon="Delete" size="small" link @click="removeFile(row.id)" />
              </template>
            </el-table-column>
          </el-table>

          <!-- Summary -->
          <div v-if="summary" class="summary-bar">
            <span>原始: {{ formatSize(summary.totalOriginal) }}</span>
            <span>→ 压缩后: {{ formatSize(summary.totalCompressed) }}</span>
            <el-tag type="success" size="small">
              节省 {{ formatSize(summary.totalOriginal - summary.totalCompressed) }}
              ({{ compressionRatio(summary.totalOriginal, summary.totalCompressed) }})
            </el-tag>
          </div>
        </div>

        <!-- Settings sidebar -->
        <div class="compress-sidebar">
          <h3 class="sidebar-title">压缩设置</h3>
          <el-form label-position="top" size="small">
            <!-- Quality -->
            <el-form-item label="质量">
              <el-slider v-model="compressStore.options.quality" :min="1" :max="100" :step="1" show-input input-size="small" />
            </el-form-item>

            <!-- Scale -->
            <el-form-item label="缩放比例">
              <el-slider v-model="compressStore.options.scale" :min="10" :max="100" :step="5" :format-tooltip="formatScaleTooltip" show-input input-size="small" />
            </el-form-item>

            <!-- Strip EXIF -->
            <el-form-item>
              <el-checkbox v-model="compressStore.options.stripExif">
                去除 EXIF 信息
              </el-checkbox>
            </el-form-item>

            <!-- Output format -->
            <el-form-item label="输出格式">
              <el-radio-group v-model="compressStore.options.outputFormat">
                <el-radio value="original">保持原格式</el-radio>
                <el-radio value="jpg">JPG</el-radio>
                <el-radio value="webp">WebP</el-radio>
                <el-radio value="png">PNG</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- Output directory -->
            <el-form-item label="输出目录">
              <el-input v-model="compressStore.options.outputDirectory" placeholder="选择输出目录" readonly size="small">
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Download, PictureFilled, FolderOpened, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useCompressStore } from "@/stores/compress.store";
import { useTaskStore } from "@/stores/task.store";
import { formatFileSize } from "@/utils/filename-sanitizer";

const compressStore = useCompressStore();
const taskStore = useTaskStore();

interface CompressFile {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  compressedSize: number | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

const files = ref<CompressFile[]>([]);
const isDragOver = ref(false);
const isCompressing = ref(false);
const tableMaxHeight = ref(500);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const canExecute = computed(() => {
  return files.value.length > 0 && !isCompressing.value && !!compressStore.options.outputDirectory;
});

const summary = computed(() => {
  const doneFiles = files.value.filter((f) => f.compressedSize != null);
  if (doneFiles.length === 0) return null;
  return {
    totalOriginal: doneFiles.reduce((sum, f) => sum + f.size, 0),
    totalCompressed: doneFiles.reduce((sum, f) => sum + (f.compressedSize || 0), 0),
  };
});

function formatSize(bytes: number): string {
  return formatFileSize(bytes);
}

function formatScaleTooltip(val: number): string {
  return `${val}%`;
}

function compressionRatio(original: number, compressed: number): string {
  if (original === 0) return "0%";
  const ratio = ((1 - compressed / original) * 100);
  return `${ratio.toFixed(1)}%`;
}

function ratioTagType(original: number, compressed: number): "success" | "warning" | "danger" {
  const ratio = 1 - compressed / original;
  if (ratio >= 0.3) return "success";
  if (ratio >= 0.1) return "warning";
  return "danger";
}

function statusTagType(status: string): "success" | "info" | "danger" | undefined {
  switch (status) {
    case "done": return "success";
    case "error": return "danger";
    case "processing": return undefined;
    default: return "info";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "待处理";
    case "processing": return "处理中";
    case "done": return "完成";
    case "error": return "错误";
    default: return status;
  }
}

// File operations
async function handleImportFiles(): Promise<void> {
  const result = await window.api.selectFiles();
  addFiles(result);
}

async function handleImportFolder(): Promise<void> {
  const result = await window.api.selectFolder();
  addFiles(result);
}

function addFiles(fileInfos: Array<{ name: string; path: string; size: number; extension: string }>): void {
  const existingPaths = new Set(files.value.map((f) => f.path));
  const newFiles: CompressFile[] = fileInfos
    .filter((f) => !existingPaths.has(f.path))
    .map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      path: f.path,
      size: f.size,
      extension: f.extension,
      compressedSize: null,
      status: "pending" as const,
    }));
  files.value.push(...newFiles);
}

function onDrop(event: DragEvent): void {
  isDragOver.value = false;
  const droppedFiles = event.dataTransfer?.files;
  if (!droppedFiles) return;

  const paths: string[] = [];
  for (let i = 0; i < droppedFiles.length; i++) {
    const file = droppedFiles[i];
    const filePath = (file as File & { path: string }).path;
    if (filePath) {
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      if (IMAGE_EXTENSIONS.has(ext)) {
        paths.push(filePath);
      }
    }
  }

  // Get file info for each path
  paths.forEach(async (p) => {
    const existingPaths = new Set(files.value.map((f) => f.path));
    if (existingPaths.has(p)) return;
    try {
      const info = await window.api.getFileInfo(p);
      files.value.push({
        id: `${Date.now()}-${Math.random()}`,
        name: info.name,
        path: info.path,
        size: info.size,
        extension: info.extension,
        compressedSize: null,
        status: "pending",
      });
    } catch { /* skip */ }
  });
}

function removeFile(id: string): void {
  files.value = files.value.filter((f) => f.id !== id);
}

function clearFiles(): void {
  files.value = [];
}

async function selectOutputDir(): Promise<void> {
  const dir = await window.api.selectDirectory();
  if (dir) {
    compressStore.updateOptions({ outputDirectory: dir });
  }
}

// Execute compression
async function executeCompress(): Promise<void> {
  if (!canExecute.value) return;

  if (!compressStore.options.outputDirectory) {
    ElMessage.warning("请先选择输出目录");
    return;
  }

  isCompressing.value = true;
  const filePaths = files.value.map((f) => f.path);

  // Reset statuses
  files.value.forEach((f) => {
    f.status = "processing";
    f.compressedSize = null;
  });

  taskStore.setCurrentTask({
    id: `compress-${Date.now()}`,
    type: "compress",
    status: "running",
    progress: 0,
    total: filePaths.length,
    completed: 0,
    message: "正在压缩...",
  });

  try {
    const result = await window.api.compressImages(filePaths, compressStore.options);
    taskStore.completeTask();

    if (result.failed > 0) {
      ElMessage.warning(`完成: ${result.success} 成功, ${result.failed} 失败`);
    } else {
      ElMessage.success(`全部完成: ${result.success} 个文件已压缩`);
    }
  } catch {
    taskStore.updateProgress({ status: "failed", message: "压缩失败" });
    ElMessage.error("压缩过程中发生错误");
  } finally {
    isCompressing.value = false;
  }
}

// Progress listener
function onProgress(
  _event: unknown,
  data: { completed: number; total: number; filePath: string; originalSize: number; compressedSize: number; status: string; error?: string },
): void {
  taskStore.updateProgress({
    completed: data.completed,
    progress: Math.round((data.completed / data.total) * 100),
    message: `正在压缩... (${data.completed}/${data.total})`,
  });

  const file = files.value.find((f) => f.path === data.filePath);
  if (file) {
    file.status = data.status as CompressFile["status"];
    if (data.compressedSize > 0) {
      file.compressedSize = data.compressedSize;
    }
    if (data.error) {
      file.error = data.error;
    }
  }
}

function updateTableHeight(): void {
  tableMaxHeight.value = window.innerHeight - 280;
}

onMounted(() => {
  window.api.onTaskProgress(onProgress);
  updateTableHeight();
  window.addEventListener("resize", updateTableHeight);
});

onUnmounted(() => {
  window.api.removeTaskProgressListener();
  window.removeEventListener("resize", updateTableHeight);
});
</script>

<style scoped>
.compress-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
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

/* Import area */
.import-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s;
}

.import-area.is-dragover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.import-icon {
  color: #c0c4cc;
}

.import-text {
  font-size: 16px;
  color: #606266;
  margin-top: 8px;
}

.import-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.import-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Working state */
.compress-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.compress-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.compact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.file-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.compact-actions {
  display: flex;
  gap: 8px;
}

.filename {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.size-text {
  font-size: 12px;
  color: #909399;
}

.size-text.compressed {
  color: #67c23a;
  font-weight: 500;
}

.summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f0f9eb;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}

/* Sidebar */
.compress-sidebar {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #e4e7ed;
  padding: 16px;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}
</style>
