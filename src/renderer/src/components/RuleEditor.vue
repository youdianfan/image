<template>
  <div class="rule-editor">
    <h3 class="editor-title">命名规则</h3>

    <el-form label-position="top" size="small">
      <!-- Template -->
      <el-form-item label="命名模板">
        <el-input
          ref="templateInput"
          v-model="rule.template"
          placeholder="{type}-{module}-{original}-{index}"
          @input="onTemplateChange"
        />
        <div class="variable-tags">
          <el-tag
            v-for="v in availableVariables"
            :key="v.name"
            size="small"
            type="info"
            class="variable-tag"
            @click="insertVariable(v.name)"
          >
            {{ v.label }}
          </el-tag>
        </div>
      </el-form-item>

      <!-- Type -->
      <el-form-item label="类型 (Type)">
        <el-select
          v-model="rule.type"
          filterable
          allow-create
          clearable
          placeholder="选择或输入类型"
          style="width: 100%"
          @change="onRuleChange"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt"
            :label="opt"
            :value="opt"
          />
        </el-select>
      </el-form-item>

      <!-- Module -->
      <el-form-item label="模块 (Module)">
        <el-select
          v-model="rule.module"
          filterable
          allow-create
          clearable
          placeholder="选择或输入模块"
          style="width: 100%"
          @change="onRuleChange"
        >
          <el-option
            v-for="opt in moduleOptions"
            :key="opt"
            :label="opt"
            :value="opt"
          />
        </el-select>
      </el-form-item>

      <!-- Index settings -->
      <el-form-item label="序号设置">
        <div class="index-settings">
          <div class="index-field">
            <label>起始</label>
            <el-input-number
              v-model="rule.startIndex"
              :min="0"
              :step="1"
              size="small"
              controls-position="right"
              @change="onRuleChange"
            />
          </div>
          <div class="index-field">
            <label>步长</label>
            <el-input-number
              v-model="rule.indexStep"
              :min="1"
              :step="1"
              size="small"
              controls-position="right"
              @change="onRuleChange"
            />
          </div>
          <div class="index-field">
            <label>位数</label>
            <el-input-number
              v-model="rule.indexDigits"
              :min="1"
              :max="10"
              :step="1"
              size="small"
              controls-position="right"
              @change="onRuleChange"
            />
          </div>
        </div>
      </el-form-item>

      <!-- Conflict strategy -->
      <el-form-item label="冲突处理">
        <el-radio-group v-model="rule.conflictStrategy" @change="onRuleChange">
          <el-radio value="autoNumber">自动编号</el-radio>
          <el-radio value="skip">跳过</el-radio>
          <el-radio value="overwrite">覆盖</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Output mode -->
      <el-form-item label="输出方式">
        <el-radio-group v-model="rule.outputMode" @change="onRuleChange">
          <el-radio value="newDirectory">输出到新目录</el-radio>
          <el-radio value="overwrite">覆盖原文件</el-radio>
        </el-radio-group>

        <template v-if="rule.outputMode === 'newDirectory'">
          <div class="output-dir-picker">
            <el-input
              v-model="rule.outputDirectory"
              placeholder="选择输出目录"
              readonly
              size="small"
            >
              <template #append>
                <el-button @click="selectOutputDir">
                  <el-icon><FolderOpened /></el-icon>
                </el-button>
              </template>
            </el-input>
          </div>
          <el-checkbox
            v-model="rule.preserveStructure"
            style="margin-top: 4px"
            @change="onRuleChange"
          >
            保留目录结构
          </el-checkbox>
        </template>
      </el-form-item>

      <!-- Reset -->
      <el-form-item>
        <el-button size="small" @click="resetRule">重置规则</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { FolderOpened } from "@element-plus/icons-vue";
import { useRenameStore } from "@/stores/rename.store";
import { storeToRefs } from "pinia";

const renameStore = useRenameStore();
const { rule } = storeToRefs(renameStore);

const templateInput =
  ref<InstanceType<(typeof import("element-plus"))["ElInput"]>>();

const typeOptions = ["product", "banner", "avatar", "icon", "bg"];
const moduleOptions = ["homepage", "detail", "blog", "list", "common"];

const availableVariables = [
  { name: "original", label: "{original}" },
  { name: "index", label: "{index}" },
  { name: "type", label: "{type}" },
  { name: "module", label: "{module}" },
  { name: "date", label: "{date}" },
];

function insertVariable(varName: string): void {
  const input = templateInput.value;
  if (input) {
    const el = (input as unknown as { input: HTMLInputElement }).input;
    if (el) {
      const start = el.selectionStart ?? rule.value.template.length;
      const end = el.selectionEnd ?? start;
      const text = rule.value.template;
      rule.value.template =
        text.slice(0, start) + `{${varName}}` + text.slice(end);
    } else {
      rule.value.template += `{${varName}}`;
    }
  } else {
    rule.value.template += `{${varName}}`;
  }
}

function onTemplateChange(): void {
  // Reactive update is handled by v-model
}

function onRuleChange(): void {
  // Reactive update is handled by storeToRefs
}

async function selectOutputDir(): Promise<void> {
  try {
    const dir = await window.api.selectDirectory();
    if (dir) {
      rule.value.outputDirectory = dir;
    }
  } catch {
    // User cancelled
  }
}

function resetRule(): void {
  renameStore.resetRule();
}
</script>

<style scoped>
.rule-editor {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.editor-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.variable-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.variable-tag {
  cursor: pointer;
  user-select: none;
}

.variable-tag:hover {
  color: #409eff;
  border-color: #409eff;
}

.index-settings {
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
  font-size: 12px;
  color: #909399;
}

.index-field .el-input-number {
  width: 100%;
}

.output-dir-picker {
  margin-top: 8px;
  width: 100%;
}
</style>
