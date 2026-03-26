# 备选方案：Flutter Desktop 架构设计

## 技术栈

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| 框架 | Flutter 3.19+ | 跨平台 UI 框架 |
| 语言 | Dart | 你已熟悉 |
| 状态管理 | Riverpod 2.0 | 类型安全的状态管理 |
| 图片处理 | flutter_image_compress + image | 压缩+处理 |
| AI 推理 | tflite_flutter / dart:ffi + ONNX C API | 离线模型推理 |
| 文件操作 | file_picker + path_provider | 文件选择与路径 |
| UI 组件 | fluent_ui (Win) / macos_ui (Mac) | 原生风格UI |

---

## 项目结构

```
image_rename_ai/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   │
│   ├── models/                  # 数据模型
│   │   ├── image_file.dart      # 图片文件模型
│   │   ├── rename_rule.dart     # 重命名规则
│   │   ├── compress_option.dart # 压缩选项
│   │   └── task.dart            # 任务模型
│   │
│   ├── providers/               # Riverpod 状态
│   │   ├── file_provider.dart
│   │   ├── rename_provider.dart
│   │   ├── compress_provider.dart
│   │   └── task_provider.dart
│   │
│   ├── services/                # 业务逻辑
│   │   ├── file_service.dart    # 文件操作
│   │   ├── image_service.dart   # 图片处理
│   │   ├── ai_service.dart      # AI推理
│   │   ├── rename_service.dart  # 重命名逻辑
│   │   └── task_service.dart    # 任务队列
│   │
│   ├── pages/                   # 页面
│   │   ├── rename_page.dart
│   │   ├── format_page.dart
│   │   ├── compress_page.dart
│   │   └── settings_page.dart
│   │
│   ├── widgets/                 # 通用组件
│   │   ├── file_list.dart
│   │   ├── rule_editor.dart
│   │   ├── preview_panel.dart
│   │   ├── import_area.dart
│   │   └── task_queue.dart
│   │
│   └── utils/                   # 工具
│       ├── name_converter.dart  # 命名格式转换
│       ├── conflict_resolver.dart
│       └── validator.dart
│
├── assets/
│   └── models/                  # AI模型文件
│       └── marian_mt/
│
├── windows/                     # Windows 平台配置
├── macos/                       # macOS 平台配置
├── pubspec.yaml
└── README.md
```

---

## 核心依赖 (pubspec.yaml)

```yaml
name: image_rename_ai
description: Batch image rename tool with AI
version: 1.0.0

environment:
  sdk: '>=3.3.0 <4.0.0'
  flutter: '>=3.19.0'

dependencies:
  flutter:
    sdk: flutter

  # 状态管理
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0

  # UI
  fluent_ui: ^4.8.0          # Windows 风格 UI
  macos_ui: ^2.0.0           # macOS 风格 UI

  # 文件操作
  file_picker: ^6.1.0
  path_provider: ^2.1.0
  path: ^1.9.0

  # 图片处理
  flutter_image_compress: ^2.1.0
  image: ^4.1.0               # 纯 Dart 图片处理

  # AI（可选，V2再加）
  tflite_flutter: ^0.10.0

  # 工具
  uuid: ^4.3.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  riverpod_generator: ^2.4.0
```

---

## 与 Electron 方案的关键差异

### 图片处理

Flutter 没有 Sharp 这样强大的单一库，需要组合使用：

```dart
// 压缩 — flutter_image_compress
import 'package:flutter_image_compress/flutter_image_compress.dart';

Future<Uint8List?> compressImage(String path, CompressOption option) async {
  return await FlutterImageCompress.compressWithFile(
    path,
    quality: option.quality,
    format: option.format == 'webp' ? CompressFormat.webp : CompressFormat.jpeg,
    minWidth: option.maxWidth,
    minHeight: option.maxHeight,
  );
}
```

```dart
// 格式转换 & 元数据 — image 包
import 'package:image/image.dart' as img;

Future<void> convertFormat(String inputPath, String outputPath, String format) async {
  final bytes = await File(inputPath).readAsBytes();
  final image = img.decodeImage(bytes);
  if (image == null) return;

  List<int> output;
  switch (format) {
    case 'jpg':
      output = img.encodeJpg(image, quality: 85);
    case 'png':
      output = img.encodePng(image);
    case 'webp':
      output = img.encodeWebP(image); // 注意：纯Dart WebP编码性能一般
    default:
      return;
  }
  await File(outputPath).writeAsBytes(output);
}
```

### AI 推理

Flutter 上 ONNX 支持不如 Node.js 成熟，有两条路：

**路径1：TFLite（推荐 Flutter 方案用这个）**
```dart
import 'package:tflite_flutter/tflite_flutter.dart';

class AiService {
  late Interpreter _interpreter;

  Future<void> loadModel() async {
    _interpreter = await Interpreter.fromAsset('models/translation.tflite');
  }

  String translate(String chinese) {
    // TFLite 推理逻辑
    // 需要将 MarianMT 转换为 TFLite 格式
  }
}
```

**路径2：FFI 调用 ONNX C API（复杂但功能强）**
```dart
// 通过 dart:ffi 调用 ONNX Runtime C 动态库
// 复杂度高，建议 V2 再考虑
```

**路径3：调用本地 Python 子进程（简单但需要用户安装 Python）**
```dart
import 'dart:io';

Future<String> translateViaPython(String text) async {
  final result = await Process.run('python', ['scripts/translate.py', text]);
  return result.stdout.toString().trim();
}
```

---

## Flutter 方案的 MVP 策略

由于 AI/ONNX 在 Flutter 上的集成复杂度较高，建议 MVP 阶段：

1. **V1 先不做离线 AI**，用在线翻译 API（Google/DeepL）作为过渡
2. 重命名 + 格式转换 + 压缩 用 Flutter 原生实现
3. V2 再加 TFLite 离线推理

```
V1 (Flutter MVP):
  ✅ 批量重命名（纯 Dart）
  ✅ 命名格式转换（纯 Dart）
  ✅ 图片压缩（flutter_image_compress）
  ⏳ 翻译用在线 API

V2:
  ✅ 离线 AI 翻译（TFLite）
  ✅ SEO 优化命名
```

---

## 何时选择 Flutter 方案

- 你更想用已有的 Flutter 技能
- 更在意包体积（50MB vs 150MB）
- AI 离线功能不是 V1 必须
- 未来可能出移动端版本（Flutter 跨端优势）
