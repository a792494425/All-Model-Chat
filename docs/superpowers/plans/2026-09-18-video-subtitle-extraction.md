# 视频字幕提取与导出（基于 Gemini 3.5 Transcribe）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AMC-WebUI 增加导入视频时自动提取字幕、在视频播放器中同步渲染、在侧边抽屉中点击时间戳交互跳转，并支持一键导出标准 `.srt` 与 `.vtt` 字幕文件的能力。

**Architecture:**
1. 客户端使用 Web Audio API 从视频离线解码音轨并降采样为 16kHz 单声道 WAV Blob（体积压缩 90%）。
2. 调用 Gemini Files API 上传轻量音频，使用 `gemini-3.5-transcribe` 模型的词级时间戳（`word_info`）及 verbatim 模式获取精准起止偏移量。
3. 前端基于自然停顿、标点符号与行长阈值进行智能断句聚合，生成标准 `SubtitleCue[]` 数组、`.srt` 与 `.vtt` 字符串。
4. `VideoPlayer` 挂载 WebVTT `<track>` 原生渲染字幕；`FilePreviewModal` 提供「提取字幕」状态流转按钮并滑出交互式字幕抽屉，支持随播放实时高亮定位、点击跳转与一键文件导出。

**Tech Stack:** TypeScript, React 18, Web Audio API, `@google/genai` (Files API & Interactions), Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-video-subtitle-extraction-design.md`

## Global Constraints

- 严禁向自建服务端引入重型转码依赖（如后端 ffmpeg），视频音轨提取完全在浏览器客户端完成；
- 遵循严密的 TDD 流程，每个模块先写测试，验证红灯后再写实现；
- 严格遵循 TypeScript strict 类型与 Prettier 代码规范，零 typecheck / lint 报错；
- 正确管理浏览器内存，生成的 WebVTT Blob URL 在重新生成或组件卸载时必须及时调用 `URL.revokeObjectURL`。

---

### Task 1: 纯前端音轨提取器（`extractAudioFromVideo.ts`）

**Files:**
- Create: `src/utils/video-subtitles/extractAudioFromVideo.ts`
- Test: `src/utils/video-subtitles/extractAudioFromVideo.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface AudioExtractionResult {
    audioBlob: Blob;
    durationSeconds: number;
  }
  export async function extractAudioFromVideo(
    videoBlob: Blob,
    signal?: AbortSignal
  ): Promise<AudioExtractionResult>;
  ```

- [ ] **Step 1: 编写测试用例**
  - 测试通过 Mock AudioContext / decodeAudioData 验证返回音频 Blob 类型为 `audio/wav` 且包含标准 44 字节 WAV 头；
  - 测试空音轨或解码失败时抛出带有语义的 `NO_AUDIO_TRACK` 错误；
  - 测试 AbortSignal 中断时能正确取消。
- [ ] **Step 2: 运行测试确保失败（RED）**
  - 运行: `npm test src/utils/video-subtitles/extractAudioFromVideo.test.ts`
- [ ] **Step 3: 实现音频抽取与 16kHz WAV 编码器**
  - 实现 PCM 16-bit 编码与 16000Hz 降采样逻辑；
  - 返回包装好的 `audioBlob` 与 `durationSeconds`。
- [ ] **Step 4: 运行测试确保全部通过（GREEN）**
- [ ] **Step 5: 提交代码**
  - `git add src/utils/video-subtitles/extractAudioFromVideo*`
  - `git commit -m "feat(video-subtitles): implement client-side audio extractor"`

---

### Task 2: 逐词时间戳聚合与 SRT / WebVTT 格式化引擎（`subtitleFormatter.ts`）

**Files:**
- Create: `src/utils/video-subtitles/subtitleFormatter.ts`
- Test: `src/utils/video-subtitles/subtitleFormatter.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface WordAnnotation {
    text: string;
    start_offset: string; // e.g. "1.200s"
    end_offset: string;   // e.g. "1.550s"
    speaker?: string;
  }
  export interface SubtitleCue {
    id: number;
    startSeconds: number;
    endSeconds: number;
    startTimeSrt: string; // "00:00:01,200"
    endTimeSrt: string;   // "00:00:01,550"
    startTimeVtt: string; // "00:00:01.200"
    endTimeVtt: string;   // "00:00:01.550"
    text: string;
    speaker?: string;
  }
  export function groupWordsIntoCues(words: WordAnnotation[]): SubtitleCue[];
  export function generateSrtContent(cues: SubtitleCue[]): string;
  export function generateVttContent(cues: SubtitleCue[]): string;
  export function downloadTextFile(filename: string, content: string, mimeType: string): void;
  ```

- [ ] **Step 1: 编写测试用例**
  - 验证时间戳解析（`"1.200s"` -> 秒数及格式化字符串）；
  - 验证停顿切句（间隙 > 0.45s 自动拆分到下一句）；
  - 验证标点符号切句（遇到句号、问号、感叹号切分）；
  - 验证字符数上限切句；
  - 验证生成的 `.srt` 编号递增、毫秒以逗号分隔；
  - 验证生成的 `.vtt` 首行包含 `WEBVTT`、毫秒以点号分隔；
  - 验证触发文件下载的辅助函数。
- [ ] **Step 2: 运行测试确保失败（RED）**
  - 运行: `npm test src/utils/video-subtitles/subtitleFormatter.test.ts`
- [ ] **Step 3: 实现断句聚合与格式化代码**
- [ ] **Step 4: 运行测试确保全部通过（GREEN）**
- [ ] **Step 5: 提交代码**
  - `git add src/utils/video-subtitles/subtitleFormatter*`
  - `git commit -m "feat(video-subtitles): implement subtitle aggregation and srt/vtt formatters"`

---

### Task 3: Gemini 3.5 Transcribe 服务调用与解析（`geminiTranscribeService.ts`）

**Files:**
- Create: `src/utils/video-subtitles/geminiTranscribeService.ts`
- Test: `src/utils/video-subtitles/geminiTranscribeService.test.ts`

**Interfaces:**
- Consumes:
  - `uploadFileApi` from `@/services/api/fileApi`
  - `getConfiguredApiClient` from `@/services/api/apiClient`
- Produces:
  ```typescript
  export async function transcribeAudioWithGemini(
    apiKey: string,
    audioBlob: Blob,
    fileName: string,
    signal: AbortSignal,
    onProgress?: (phase: 'uploading' | 'transcribing', progressPercent?: number) => void
  ): Promise<WordAnnotation[]>;
  ```

- [ ] **Step 1: 编写测试用例**
  - Mock `uploadFileApi` 与 `ai.interactions.create`；
  - 验证请求使用了 `model: 'gemini-3.5-transcribe'`，并配置了 `timestamp_granularities: ['word']` 与 `mode: { type: 'verbatim' }`；
  - 验证从 `interaction.steps[0].content[0].annotations` 正确提取 `word_info`；
  - 验证错误处理（如缺少 key、接口异常）。
- [ ] **Step 2: 运行测试确保失败（RED）**
  - 运行: `npm test src/utils/video-subtitles/geminiTranscribeService.test.ts`
- [ ] **Step 3: 实现转写服务代码**
- [ ] **Step 4: 运行测试确保全部通过（GREEN）**
- [ ] **Step 5: 提交代码**
  - `git add src/utils/video-subtitles/geminiTranscribeService*`
  - `git commit -m "feat(video-subtitles): implement gemini-3.5-transcribe api client service"`

---

### Task 4: VideoPlayer 原生字幕轨渲染支持（`VideoPlayer.tsx`）

**Files:**
- Modify: `src/components/shared/file-preview/VideoPlayer.tsx`
- Test: `src/components/shared/file-preview/VideoPlayer.test.tsx`

**Interfaces:**
- Modifies `VideoPlayerProps` 增加 `subtitlesSrc?: string` 属性；
- 当 `subtitlesSrc` 存在时在 `<video>` 内渲染 `<track kind="subtitles" default />`。

- [ ] **Step 1: 编写测试用例**
  - 在 `VideoPlayer.test.tsx` 中添加测试：当传入 `subtitlesSrc="blob:test-vtt"` 时，容器内的 `<video>` 包含 `<track kind="subtitles">` 且 `src="blob:test-vtt"`。
- [ ] **Step 2: 运行测试确保失败（RED）**
  - 运行: `npm test src/components/shared/file-preview/VideoPlayer.test.tsx`
- [ ] **Step 3: 修改 `VideoPlayer.tsx` 增加 `subtitlesSrc` 并在 `<video>` 中渲染 `<track>`**
- [ ] **Step 4: 运行测试确保全部通过（GREEN）**
- [ ] **Step 5: 提交代码**
  - `git add src/components/shared/file-preview/VideoPlayer*`
  - `git commit -m "feat(video-subtitles): add native subtitle track support to VideoPlayer"`

---

### Task 5: 交互式字幕抽屉组件（`VideoSubtitlesDrawer.tsx`）

**Files:**
- Create: `src/components/shared/file-preview/video/VideoSubtitlesDrawer.tsx`
- Test: `src/components/shared/file-preview/video/VideoSubtitlesDrawer.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface VideoSubtitlesDrawerProps {
    cues: SubtitleCue[];
    currentTime: number;
    onSeek: (seconds: number) => void;
    onClose: () => void;
    videoFileName: string;
  }
  export const VideoSubtitlesDrawer: React.FC<VideoSubtitlesDrawerProps>;
  ```

- [ ] **Step 1: 编写测试用例**
  - 验证字幕条目完整渲染；
  - 验证当前时间落在某条目区间时该条目高亮（Active）；
  - 验证点击条目触发 `onSeek(cue.startSeconds)`；
  - 验证点击「下载 SRT」、「下载 VTT」、「复制文本」正确调用格式生成与下载。
- [ ] **Step 2: 运行测试确保失败（RED）**
  - 运行: `npm test src/components/shared/file-preview/video/VideoSubtitlesDrawer.test.tsx`
- [ ] **Step 3: 实现 `VideoSubtitlesDrawer.tsx`**
  - 包含时间轴列表、实时高亮跟随滚动、下载控制栏。
- [ ] **Step 4: 运行测试确保全部通过（GREEN）**
- [ ] **Step 5: 提交代码**
  - `git add src/components/shared/file-preview/video/VideoSubtitlesDrawer*`
  - `git commit -m "feat(video-subtitles): implement interactive VideoSubtitlesDrawer component"`

---

### Task 6: 视频预览弹窗全流程整合与 i18n 多语言（`FilePreviewModal.tsx`）

**Files:**
- Modify: `src/components/modals/FilePreviewModal.tsx`
- Modify: `src/i18n/translations/header.ts`（或对应的通用词典）
- Test: `src/components/modals/FilePreviewModal.test.tsx`

**Interfaces:**
- 在 `FilePreviewModal` 顶部栏增加「✨ 提取字幕」按钮，维护提取进度状态（idle / extracting / uploading / transcribing / ready / error）；
- 将生成的 VTT 注入 `VideoPlayer`；
- 当字幕就绪时在右侧并列展示 `VideoSubtitlesDrawer`；
- 组件卸载时释放 Blob URL。

- [ ] **Step 1: 补充中英文 i18n 字典键值**
  - `extractSubtitles`, `extractingAudio`, `uploadingAudio`, `transcribingSubtitles`, `downloadSrt`, `downloadVtt`, `copySubtitleText`, `noAudioTrackDetected`, `subtitlesReady`。
- [ ] **Step 2: 编写 `FilePreviewModal` 提取字幕按钮与抽屉展示的测试**
- [ ] **Step 3: 整合提取流水线并实现响应式分栏布局**
- [ ] **Step 4: 运行测试并进行全局验证**
  - `npm test src/components/modals/FilePreviewModal.test.tsx`
  - `npm run typecheck`
- [ ] **Step 5: 提交代码**
  - `git add src/components/modals/FilePreviewModal.tsx src/i18n/ ...`
  - `git commit -m "feat(video-subtitles): integrate subtitle extraction workflow in FilePreviewModal"`
