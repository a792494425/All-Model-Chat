import React from 'react';
import { Folders, History as HistoryIcon, ScrollText, Square } from 'lucide-react';
import { type IconProps, defaultSize, defaultStroke, defaultColor } from '@/components/icons/iconPrimitives';

/**
 * Cherry Studio 原版新建聊天图标 - 1:1 复刻
 * Source: cherry-studio/src/renderer/components/icons/NewConversationIcon.tsx
 * Original: Copyright (c) CherryHQ, licensed under GNU AGPL v3
 * https://github.com/CherryHQ/cherry-studio/blob/main/LICENSE
 * 本文件按 AGPL-3.0 授权（与 Cherry Studio 一致），AMC 其余代码仍为 MIT。
 * 若需保持纯 MIT，请勿直接拷贝此段路径，改用 lucide 的 MessageSquarePlus 替代。
 */
export const IconNewChat: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = 1.8,
  className,
  color = defaultColor,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <g transform="translate(12 12) scale(1.1) translate(-12 -12)">
      <path d="M13 4H6a2 2 0 0 0-2 2v13l4-3h10a2 2 0 0 0 2-2v-3" />
      <path d="M18 3.5v5" />
      <path d="M15.5 6h5" />
    </g>
  </svg>
);

export const IconNewGroup: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => (
  <Folders
    size={size}
    strokeWidth={strokeWidth}
    className={className}
    color={color}
    data-testid="new-group-folder-icon"
  />
);

export const IconSidebarToggle: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="8" y2="8" />
    <line x1="4" x2="14" y1="16" y2="16" />
  </svg>
);

export const IconHistory: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <HistoryIcon size={size} strokeWidth={strokeWidth} className={className} color={color} />;

export const IconStop: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <Square size={size} strokeWidth={strokeWidth} className={className} color={color} fill={color} />;

export const IconScenarios: React.FC<IconProps> = ({
  size = defaultSize,
  strokeWidth = defaultStroke,
  className,
  color = defaultColor,
}) => <ScrollText size={size} strokeWidth={strokeWidth} className={className} color={color} />;

/**
 * Cherry Studio MCP Logo - 1:1 复刻
 * Source: cherry-studio/src/renderer/components/icons/SvgIcon.tsx#McpLogo
 * Original: Copyright (c) CherryHQ, licensed under GNU AGPL v3
 * https://github.com/CherryHQ/cherry-studio/blob/main/LICENSE
 * 本图标按 AGPL-3.0 授权，AMC 其余代码仍为 MIT。
 */
export const IconMcp: React.FC<IconProps> = ({ size = defaultSize, className, color = defaultColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    fillRule="evenodd"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" />
    <path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" />
  </svg>
);

/**
 * DeepSeek Harness 侧边栏视图选项图标 - 1:1 复刻
 * Source: deepseek-harness/packages/client/ui-primitives/src/icons/index.tsx#IconPersonalizationOutline16
 * Original: ic_ds_personalization_outline_16 (figma extract)
 */
export const IconViewOptions: React.FC<IconProps> = ({ size = defaultSize, className, color = defaultColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      transform="translate(1.292 1.3)"
      d="M10.3232 9.18164C11.2868 9.18164 12.0985 9.82833 12.3506 10.7109L13.415 10.7109L13.415 11.8711L12.3496 11.8711C12.0971 12.7532 11.2864 13.3994 10.3232 13.3994C9.36031 13.3992 8.55012 12.7531 8.29785 11.8711L0 11.8711L0 10.7109L8.29688 10.7109C8.54876 9.82845 9.35988 9.18186 10.3232 9.18164ZM10.3232 10.3418C9.7999 10.3421 9.37534 10.7667 9.375 11.29C9.375 11.8137 9.79969 12.239 10.3232 12.2393C10.847 12.2393 11.2725 11.8138 11.2725 11.29C11.2721 10.7666 10.8468 10.3418 10.3232 10.3418ZM3.08301 4.59082C4.04605 4.59095 4.85696 5.23717 5.10938 6.11914L13.415 6.11914L13.415 7.2793L5.11035 7.2793C4.85833 8.16202 4.04648 8.80846 3.08301 8.80859C2.11972 8.80843 1.30963 8.16179 1.05762 7.2793L0 7.2793L0 6.11914L1.05762 6.11914C1.30994 5.23728 2.12006 4.59098 3.08301 4.59082ZM3.08301 5.75098C2.55962 5.75117 2.13512 6.17587 2.13477 6.69922C2.13477 7.22287 2.5594 7.64824 3.08301 7.64844C3.60665 7.64828 4.03223 7.2229 4.03223 6.69922C4.03187 6.17585 3.60643 5.75113 3.08301 5.75098ZM10.3232 0C11.2869 0 12.0986 0.646596 12.3506 1.5293L13.415 1.5293L13.415 2.68945L12.3496 2.68945C12.0971 3.57154 11.2858 4.21777 10.3232 4.21777C9.36037 4.21756 8.55018 3.57139 8.29785 2.68945L0 2.68945L0 1.5293L8.29688 1.5293C8.5487 0.646717 9.35981 0.00021854 10.3232 0ZM10.3232 1.16016C9.79969 1.16016 9.375 1.58496 9.375 2.1084C9.375 2.63203 9.79969 3.05762 10.3232 3.05762C10.8468 3.05762 11.2725 2.63203 11.2725 2.1084C11.2725 1.58496 10.8468 1.16016 10.3232 1.16016Z"
      fill={color}
    />
  </svg>
);

export const IconGoogle: React.FC<IconProps> = ({ size = defaultSize, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </g>
  </svg>
);
