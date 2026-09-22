import type { SupportedLanguage } from '@/i18n/languageRegistry';

const extractAvailableFileNames = (directives: string[], mediaType: 'image' | 'video' | 'audio' | 'pdf'): string[] => {
  const pattern = new RegExp(`available ${mediaType} file names are:\\s*([^\\n]+)`, 'i');
  for (const directive of directives) {
    const match = directive.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim().replace(/\.$/, '');
      const names = raw
        .split(',')
        .map((s) => s.replace(/["']/g, '').trim())
        .filter(Boolean);
      if (names.length > 0) return names;
    }
  }
  return [];
};

/**
 * Generates comprehensive citation & deep-linking directives for Live UI mode
 * when reference media files (PDF, video, audio, image) and their navigation
 * protocols are attached to the session.
 */
export const buildLiveUiMediaCitationDirective = (
  language: SupportedLanguage = 'zh',
  activeLocateDirectives: string[] = [],
): string => {
  const hasDirectives = activeLocateDirectives.length > 0;
  const isImageActive = !hasDirectives || activeLocateDirectives.some((d) => /image[- ]?locate|visual grounding/i.test(d));
  const isPdfActive = !hasDirectives || activeLocateDirectives.some((d) => /pdf[- ]?locate/i.test(d));
  const isVideoActive = !hasDirectives || activeLocateDirectives.some((d) => /video[- ]?locate/i.test(d));
  const isAudioActive = !hasDirectives || activeLocateDirectives.some((d) => /audio[- ]?locate/i.test(d));

  const anySpecificMatched = hasDirectives && (isImageActive || isPdfActive || isVideoActive || isAudioActive);
  const showImage = hasDirectives ? (anySpecificMatched ? isImageActive : true) : true;
  const showPdf = hasDirectives ? (anySpecificMatched ? isPdfActive : true) : true;
  const showVideo = hasDirectives ? (anySpecificMatched ? isVideoActive : true) : true;
  const showAudio = hasDirectives ? (anySpecificMatched ? isAudioActive : true) : true;

  const imageFiles = extractAvailableFileNames(activeLocateDirectives, 'image');
  const pdfFiles = extractAvailableFileNames(activeLocateDirectives, 'pdf');
  const videoFiles = extractAvailableFileNames(activeLocateDirectives, 'video');
  const audioFiles = extractAvailableFileNames(activeLocateDirectives, 'audio');

  if (language === 'zh') {
    const sections: string[] = [
      '### Live UI 媒体引用与跳转交互规范',
      '当前会话附带有参考文档（PDF）、视频、音频或图像材料。',
      '在生成的 HTML 组件、卡片、表格或按钮中，当引用了具体参考材料（尤其是定位、查找、分析具体目标或时刻）时，可添加以下交互属性以支持用户点击交互直达：',
    ];

    if (showImage) {
      const fileHint = imageFiles.length > 0 ? `（可用图像文件：${imageFiles.map((f) => `"${f}"`).join(', ')}）` : '';
      sections.push(
        [
          `#### 1. 图像视觉定位与高亮（Image Grounding）${fileHint}`,
          '当分析、标注、寻找或解释图像中的特定目标、物体、区域或界面元素时，请在 HTML 标签（如 `<button>`、`<div class="card">`、`<span>` 等）上添加以下属性：',
          '- 目标区域（Bounding Box）：添加 `data-amc-seek-kind="image"` 和 `data-amc-seek-box="ymin,xmin,ymax,xmax"`。坐标必须归一化至 0-1000 整数范围（图像左上角为 [0,0]，右下角为 [1000,1000]）。',
          '  例如：`<button data-amc-seek-kind="image" data-amc-seek-box="150,200,600,750" data-amc-seek-label="目标物体">📍 查看目标物体</button>`',
          '- 目标点位（指示箭头）：添加 `data-amc-seek-kind="image"` 和 `data-amc-seek-point="y,x"`（0-1000 坐标），可选 `data-amc-seek-arrow="top|bottom|left|right|top-left|top-right"`。',
          '  例如：`<button data-amc-seek-kind="image" data-amc-seek-point="320,480" data-amc-seek-arrow="top" data-amc-seek-label="操作按钮">🎯 查看按钮位置</button>`',
          '- 标签与文件：可添加 `data-amc-seek-label="目标名称"`；若有多张图像，附带 `data-amc-seek-doc="文件名"`。',
          '- 兼容标签：亦可在 HTML 内直接使用标准 `<image-locate file="文件名" box="ymin,xmin,ymax,xmax" label="名称">描述</image-locate>`。',
        ].join('\n'),
      );
    }

    if (showPdf) {
      const fileHint = pdfFiles.length > 0 ? `（可用 PDF 文件：${pdfFiles.map((f) => `"${f}"`).join(', ')}）` : '';
      sections.push(
        [
          `#### 2. PDF 文档页码与区域跳转（PDF Navigation）${fileHint}`,
          '当引用或分析 PDF 文档的具体页码、章节、段落或图表时，请在 HTML 标签上添加以下属性：',
          '- 页码跳转：添加 `data-amc-seek-page="页码"`（1 起始的整数页码）。',
          '  例如：`<button data-amc-seek-page="5">📄 查看第 5 页数据</button>`',
          '- 页面内区域高亮：可附带 `data-amc-seek-box="ymin,xmin,ymax,xmax"`（0-1000 归一化坐标）高亮该页特定段落或图表，或 `data-amc-seek-point="y,x"` 指示具体位置。',
          '- 多文档：若有多份 PDF，附带 `data-amc-seek-doc="文件名"`。',
          '  例如：`<button data-amc-seek-page="8" data-amc-seek-box="120,100,450,900" data-amc-seek-doc="annual_report.pdf">📊 第 8 页财务表</button>`',
          '- 兼容标签：亦可在 HTML 内直接使用标准 `<pdf-locate doc="文件名" page="页码" box="ymin,xmin,ymax,xmax">引用摘要</pdf-locate>`。',
        ].join('\n'),
      );
    }

    if (showVideo) {
      const fileHint = videoFiles.length > 0 ? `（可用视频文件：${videoFiles.map((f) => `"${f}"`).join(', ')}）` : '';
      sections.push(
        [
          `#### 3. 视频时间戳与准星镜头定位（Video Navigation）${fileHint}`,
          '当分析、解释或引用视频中的具体时刻、画面片段、关键动作或屏幕目标时，请在 HTML 标签上添加以下属性：',
          '- 时间戳跳转：添加 `data-amc-seek-kind="video"` 和 `data-amc-seek-time="秒数"` 或 `data-amc-seek-time="mm:ss"`（长视频可用 `h:mm:ss`）。',
          '  例如：`<button data-amc-seek-kind="video" data-amc-seek-time="01:25">⏱️ 01:25 关键步骤演示</button>`',
          '- 屏幕准星镜头追踪：添加 `data-amc-seek-point="y,x"`（0-1000 归一化坐标）可在视频对应画面上激活相机准星跟踪目标位置，可选附带 `data-amc-seek-box="ymin,xmin,ymax,xmax"`。',
          '- 多视频：若有多部视频，附带 `data-amc-seek-doc="文件名"`。',
          '  例如：`<button data-amc-seek-kind="video" data-amc-seek-time="02:15" data-amc-seek-point="420,680">🎯 02:15 观察选手动作</button>`',
          '- 兼容标签：亦可在 HTML 内直接使用标准 `<video-locate video="文件名" start="mm:ss" point="y,x">描述</video-locate>`。',
        ].join('\n'),
      );
    }

    if (showAudio) {
      const fileHint = audioFiles.length > 0 ? `（可用音频文件：${audioFiles.map((f) => `"${f}"`).join(', ')}）` : '';
      sections.push(
        [
          `#### 4. 音频时间戳定位（Audio Navigation）${fileHint}`,
          '当分析、总结或引用音频中的具体发言、段落或时间点时，请在 HTML 标签上添加以下属性：',
          '- 时间戳跳转：添加 `data-amc-seek-kind="audio"` 和 `data-amc-seek-time="秒数"` 或 `data-amc-seek-time="mm:ss"`。',
          '  例如：`<button data-amc-seek-kind="audio" data-amc-seek-time="03:45">🎵 03:45 核心结论陈述</button>`',
          '- 多音频：若有多份音频，附带 `data-amc-seek-doc="文件名"`。',
          '- 兼容标签：亦可在 HTML 内直接使用标准 `<audio-locate audio="文件名" start="mm:ss">描述</audio-locate>`。',
        ].join('\n'),
      );
    }

    sections.push('客户端已内置交互监听器，用户点击卡片或按钮中的这些属性时，右侧多媒体查看器将自动联动响应（跳转页码、定位时间戳或高亮标注目标）。');
    return sections.join('\n\n');
  }

  // English localization
  const sections: string[] = [
    '### Live UI Media Citation & Navigation Protocol',
    'Reference media files (PDF, video, audio, or images) are attached to this conversation.',
    'When referencing specific parts of the attached media (especially locating objects, jumping to pages, or referencing timestamps) within your generated HTML components, cards, tables, or buttons, add the following interactive attributes:',
  ];

  if (showImage) {
    const fileHint = imageFiles.length > 0 ? ` (Available images: ${imageFiles.map((f) => `"${f}"`).join(', ')})` : '';
    sections.push(
      [
        `#### 1. Image Visual Grounding (Live UI)${fileHint}`,
        'When identifying, locating, analyzing, or referring to specific objects, regions, UI elements, or details in an image, add these attributes to HTML elements (e.g. `<button>`, `<div class="card">`, `<span>`):',
        '- Bounding Box (regions / objects): Add `data-amc-seek-kind="image"` and `data-amc-seek-box="ymin,xmin,ymax,xmax"`. Coordinates MUST be normalized to a 0-1000 scale (origin [0,0] at top-left, [1000,1000] at bottom-right).',
        '  Example: `<button data-amc-seek-kind="image" data-amc-seek-box="150,200,600,750" data-amc-seek-label="Target">📍 Locate Target</button>`',
        '- Guide Arrow (specific points / icons): Add `data-amc-seek-kind="image"` and `data-amc-seek-point="y,x"` (0-1000 scale), optional `data-amc-seek-arrow="top|bottom|left|right|top-left|top-right"`.',
        '  Example: `<button data-amc-seek-kind="image" data-amc-seek-point="320,480" data-amc-seek-arrow="top" data-amc-seek-label="Action Button">🎯 View Button</button>`',
        '- Label & Multiple Files: Add `data-amc-seek-label="Label"`; if multiple images are attached, specify `data-amc-seek-doc="FILENAME"`.',
        '- Standard tags: Inserting `<image-locate file="FILENAME" box="ymin,xmin,ymax,xmax" label="LABEL">description</image-locate>` is also fully supported.',
      ].join('\n'),
    );
  }

  if (showPdf) {
    const fileHint = pdfFiles.length > 0 ? ` (Available PDFs: ${pdfFiles.map((f) => `"${f}"`).join(', ')})` : '';
    sections.push(
      [
        `#### 2. PDF Page & Region Navigation (Live UI)${fileHint}`,
        'When citing or analyzing specific pages, sections, paragraphs, figures, or data tables in attached PDF documents, add these attributes to HTML elements:',
        '- Page Seek: Add `data-amc-seek-page="PAGE_NUMBER"` (1-based integer).',
        '  Example: `<button data-amc-seek-page="5">📄 Go to Page 5</button>`',
        '- Precise Region & Multiple Docs: Optional `data-amc-seek-box="ymin,xmin,ymax,xmax"` (0-1000 scale) to highlight the figure, paragraph, or table on that page, or `data-amc-seek-point="y,x"`. If multiple PDFs exist, add `data-amc-seek-doc="FILENAME"`.',
        '  Example: `<button data-amc-seek-page="8" data-amc-seek-box="120,100,450,900" data-amc-seek-doc="report.pdf">📊 Page 8 Table</button>`',
        '- Standard tags: Inserting `<pdf-locate doc="FILENAME" page="PAGE_NUMBER" box="ymin,xmin,ymax,xmax">quote</pdf-locate>` is also fully supported.',
      ].join('\n'),
    );
  }

  if (showVideo) {
    const fileHint = videoFiles.length > 0 ? ` (Available videos: ${videoFiles.map((f) => `"${f}"`).join(', ')})` : '';
    sections.push(
      [
        `#### 3. Video Timestamp & Viewfinder Navigation (Live UI)${fileHint}`,
        'When analyzing, explaining, or referencing specific moments, scenes, actions, or screen objects in attached videos, add these attributes to HTML elements:',
        '- Timestamp Seek: Add `data-amc-seek-kind="video"` and `data-amc-seek-time="SECONDS"` or `data-amc-seek-time="mm:ss"` (use `h:mm:ss` for videos over 1 hour).',
        '  Example: `<button data-amc-seek-kind="video" data-amc-seek-time="01:25">⏱️ 01:25 Key Step</button>`',
        '- Precision Viewfinder Reticle: Add `data-amc-seek-point="y,x"` (0-1000 scale) to project a camera viewfinder reticle onto the target coordinates at that timestamp. Optional `data-amc-seek-box="ymin,xmin,ymax,xmax"`. If multiple videos exist, add `data-amc-seek-doc="FILENAME"`.',
        '  Example: `<button data-amc-seek-kind="video" data-amc-seek-time="02:15" data-amc-seek-point="420,680">🎯 02:15 Target Action</button>`',
        '- Standard tags: Inserting `<video-locate video="FILENAME" start="mm:ss" point="y,x">description</video-locate>` is also fully supported.',
      ].join('\n'),
    );
  }

  if (showAudio) {
    const fileHint = audioFiles.length > 0 ? ` (Available audios: ${audioFiles.map((f) => `"${f}"`).join(', ')})` : '';
    sections.push(
      [
        `#### 4. Audio Timestamp Navigation (Live UI)${fileHint}`,
        'When analyzing, summarizing, or citing specific statements, segments, or moments in attached audio recordings, add these attributes to HTML elements:',
        '- Timestamp Seek: Add `data-amc-seek-kind="audio"` and `data-amc-seek-time="SECONDS"` or `data-amc-seek-time="mm:ss"`.',
        '  Example: `<button data-amc-seek-kind="audio" data-amc-seek-time="03:45">🎵 03:45 Key Statement</button>`',
        '- Multiple Audios: If multiple audios exist, add `data-amc-seek-doc="FILENAME"`.',
        '- Standard tags: Inserting `<audio-locate audio="FILENAME" start="mm:ss">description</audio-locate>` is also fully supported.',
      ].join('\n'),
    );
  }

  sections.push(
    'The client UI automatically listens for click interactions on these elements to navigate the media viewer (jumping to page, seeking timestamp, or highlighting visual target).',
  );
  return sections.join('\n\n');
};
