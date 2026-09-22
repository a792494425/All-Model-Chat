import { describe, expect, it } from 'vitest';
import { buildLiveUiMediaCitationDirective } from './liveUiMediaCitation';

describe('buildLiveUiMediaCitationDirective', () => {
  it('generates all 4 media protocols in Chinese by default when no directives specified', () => {
    const directive = buildLiveUiMediaCitationDirective('zh');
    expect(directive).toContain('### Live UI 媒体引用与跳转交互规范');
    expect(directive).toContain('1. 图像视觉定位与高亮（Image Grounding）');
    expect(directive).toContain('data-amc-seek-box="ymin,xmin,ymax,xmax"');
    expect(directive).toContain('data-amc-seek-point="y,x"');
    expect(directive).toContain('2. PDF 文档页码与区域跳转（PDF Navigation）');
    expect(directive).toContain('data-amc-seek-page="页码"');
    expect(directive).toContain('3. 视频时间戳与准星镜头定位（Video Navigation）');
    expect(directive).toContain('data-amc-seek-kind="video"');
    expect(directive).toContain('4. 音频时间戳定位（Audio Navigation）');
    expect(directive).toContain('data-amc-seek-kind="audio"');
  });

  it('generates all 4 media protocols in English by default when language is en', () => {
    const directive = buildLiveUiMediaCitationDirective('en');
    expect(directive).toContain('### Live UI Media Citation & Navigation Protocol');
    expect(directive).toContain('1. Image Visual Grounding (Live UI)');
    expect(directive).toContain('2. PDF Page & Region Navigation (Live UI)');
    expect(directive).toContain('3. Video Timestamp & Viewfinder Navigation (Live UI)');
    expect(directive).toContain('4. Audio Timestamp Navigation (Live UI)');
  });

  it('selectively includes only Image Grounding when only image locate directives are active', () => {
    const directive = buildLiveUiMediaCitationDirective('zh', [
      '### Image Visual Grounding Protocol\nOne or more images are attached. The available image file names are: "figure1.png", "figure2.png".',
    ]);
    expect(directive).toContain('1. 图像视觉定位与高亮（Image Grounding）');
    expect(directive).toContain('figure1.png');
    expect(directive).not.toContain('2. PDF 文档页码与区域跳转');
    expect(directive).not.toContain('3. 视频时间戳与准星镜头定位');
    expect(directive).not.toContain('4. 音频时间戳定位');
  });

  it('selectively includes only PDF Navigation when only PDF locate directives are active', () => {
    const directive = buildLiveUiMediaCitationDirective('zh', [
      '### PDF Locate Protocol\nOne or more PDF documents are attached. The available PDF file names are: "whitepaper.pdf".',
    ]);
    expect(directive).toContain('2. PDF 文档页码与区域跳转（PDF Navigation）');
    expect(directive).toContain('whitepaper.pdf');
    expect(directive).not.toContain('1. 图像视觉定位与高亮');
    expect(directive).not.toContain('3. 视频时间戳与准星镜头定位');
  });

  it('selectively includes only Video Navigation when only video locate directives are active', () => {
    const directive = buildLiveUiMediaCitationDirective('en', [
      '### Video Locate Protocol\nOne or more videos are attached. The available video file names are: "recording.mp4".',
    ]);
    expect(directive).toContain('3. Video Timestamp & Viewfinder Navigation (Live UI)');
    expect(directive).toContain('recording.mp4');
    expect(directive).not.toContain('1. Image Visual Grounding');
    expect(directive).not.toContain('2. PDF Page & Region Navigation');
  });

  it('selectively includes only Audio Navigation when only audio locate directives are active', () => {
    const directive = buildLiveUiMediaCitationDirective('zh', [
      '### Audio Locate Protocol\nOne or more audio recordings are attached. The available audio file names are: "interview.mp3".',
    ]);
    expect(directive).toContain('4. 音频时间戳定位（Audio Navigation）');
    expect(directive).toContain('interview.mp3');
    expect(directive).not.toContain('1. 图像视觉定位与高亮');
    expect(directive).not.toContain('3. 视频时间戳与准星镜头定位');
  });

  it('falls back to all 4 protocols when unrecognized locate directives are present', () => {
    const directive = buildLiveUiMediaCitationDirective('zh', ['[CUSTOM_DIRECTIVE: foo]']);
    expect(directive).toContain('1. 图像视觉定位与高亮（Image Grounding）');
    expect(directive).toContain('2. PDF 文档页码与区域跳转（PDF Navigation）');
    expect(directive).toContain('3. 视频时间戳与准星镜头定位（Video Navigation）');
    expect(directive).toContain('4. 音频时间戳定位（Audio Navigation）');
  });
});
