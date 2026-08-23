import React from 'react';
import { ChatInputToolbar } from './ChatInputToolbar';
import { ChatInputActions } from './ChatInputActions';
import { SlashCommandMenu } from './SlashCommandMenu';
import { ChatSuggestions } from './area/ChatSuggestions';
import { ChatQuoteDisplay } from './area/ChatQuoteDisplay';
import { ChatFilePreviewList } from './area/ChatFilePreviewList';
import { ChatTextArea } from './area/ChatTextArea';
import { LiveStatusBanner } from './LiveStatusBanner';
import { QueuedSubmissionList } from './QueuedSubmissionList';
import { HiddenFileInputs } from './files/HiddenFileInputs';
import { getChatInputAreaLayout } from './chatInputAreaLayout';
import { CHAT_INPUT_MAX_WIDTH_CLASS, FOCUS_BLOCKING_SELECTOR } from '@/constants/layout';
import { useI18n } from '@/contexts/I18nContext';
import { useChatInputContext } from './ChatInputContext';
import { ChatInputExpandCorner } from './ChatInputExpandCorner';
import { useChatInputExpandSizing } from './useChatInputExpandSizing';

export const ChatInputArea: React.FC = () => {
  const { t } = useI18n();
  const {
    chatInput,
    inputState,
    capabilities,
    liveApi,
    modalsState,
    localFileState,
    voiceState,
    slashCommandState,
    handlers,
    inputDisabled,
    initialTextareaHeight,
    queuedSubmissionsView,
  } = useChatInputContext();

  const isFullscreen = inputState.isFullscreen;
  const isPipActive = chatInput.isPipActive;
  const isAnimatingSend = inputState.isAnimatingSend;
  const isMobile = inputState.isMobile;
  const isConverting = localFileState.isConverting;
  const isRecording = voiceState.isRecording;
  const isExpanded = isFullscreen;

  const {
    isUIBlocked,
    wrapperClass,
    innerContainerClass,
    formClass,
    inputContainerClass,
    queuedSubmissionContainerClass,
    actionsContainerClass,
  } = getChatInputAreaLayout({
    isPipActive,
    isAnimatingSend,
    isRecording: !!isRecording,
    inputDisabled,
  });

  const minHeight = isMobile ? 26 : initialTextareaHeight + 2;
  const {
    frameRef,
    frameStyle,
    isResizing,
    startResize,
    handleResizeKeyDown,
    handleTransitionEnd,
    toggleExpanded,
    hasCustomHeight,
    maxHeight,
    resizeHandleValue,
  } = useChatInputExpandSizing({
    isExpanded,
    onExpandedChange: (next) => {
      if (next !== isExpanded) inputState.handleToggleFullscreen();
    },
    focusEditor: () => inputState.textareaRef.current?.focus(),
    minHeight,
  });
  const handleInputShellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(FOCUS_BLOCKING_SELECTOR)) {
      return;
    }

    inputState.textareaRef.current?.focus();
  };

  const fileInputState: React.ComponentProps<typeof HiddenFileInputs>['fileInputs'] = {
    fileInputRef: modalsState.fileInputRef,
    imageInputRef: modalsState.imageInputRef,
    folderInputRef: modalsState.folderInputRef,
    zipInputRef: modalsState.zipInputRef,
    cameraInputRef: modalsState.cameraInputRef,
    handleFileChange: handlers.handleFileChange,
    handleFolderChange: handlers.handleFolderChange,
    handleZipChange: handlers.handleZipChange,
  };

  return (
    <div className={wrapperClass} aria-hidden={isUIBlocked}>
      {capabilities.isNativeAudioModel && (
        <video
          ref={liveApi.videoRef}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          className="fixed h-px w-px opacity-0 pointer-events-none"
        />
      )}
      <div className={`mx-auto w-full ${CHAT_INPUT_MAX_WIDTH_CLASS} px-2 sm:px-3`}>
        {chatInput.showEmptyStateSuggestions && capabilities.permissions.canGenerateSuggestions && !isExpanded && (
          <ChatSuggestions
            show={chatInput.showEmptyStateSuggestions}
            onSuggestionClick={chatInput.onSuggestionClick}
            onOrganizeInfoClick={chatInput.onOrganizeInfoClick}
            onToggleBBox={chatInput.onToggleBBox}
            isBBoxModeActive={chatInput.isBBoxModeActive}
            onToggleGuide={chatInput.onToggleGuide}
            isGuideModeActive={chatInput.isGuideModeActive}
            isFullscreen={isFullscreen}
          />
        )}
      </div>

      <div className={innerContainerClass}>
        {/* Wrap toolbar in z-indexed container to ensure dropdowns render above status banner */}
        <div className="relative z-50">
          <ChatInputToolbar />
        </div>

        <LiveStatusBanner
          isConnected={liveApi.isConnected}
          isSpeaking={liveApi.isSpeaking}
          isReconnecting={liveApi.isReconnecting}
          volume={liveApi.volume}
          error={liveApi.error}
          onDisconnect={liveApi.disconnect}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handlers.handleSubmit();
          }}
          className={formClass}
        >
          <SlashCommandMenu
            isOpen={slashCommandState.slashCommandState.isOpen}
            commands={slashCommandState.slashCommandState.filteredCommands}
            onSelect={slashCommandState.handleCommandSelect}
            selectedIndex={slashCommandState.slashCommandState.selectedIndex}
            query={slashCommandState.slashCommandState.query}
          />
          {queuedSubmissionsView && (
            <div className={queuedSubmissionContainerClass}>
              <QueuedSubmissionList view={queuedSubmissionsView} />
            </div>
          )}
          <div
            className={`${inputContainerClass} ${hasCustomHeight ? 'expanded' : ''}`}
            onClick={handleInputShellClick}
          >
            <div
              data-composer-resize-handle=""
              data-resizing={isResizing || undefined}
              role="separator"
              aria-orientation="horizontal"
              aria-valuemin={minHeight}
              aria-valuemax={maxHeight}
              aria-valuenow={resizeHandleValue}
              aria-label={t('chatInputResizeHandleAria')}
              tabIndex={0}
              onMouseDown={startResize}
              onKeyDown={handleResizeKeyDown}
              className="group/composer-resize-handle absolute top-0 right-4 left-4 z-30 h-2 cursor-row-resize [-webkit-app-region:no-drag] focus-visible:bg-primary/40 focus-visible:outline-none"
            >
              <div className="absolute top-0 right-0 left-0 h-0.5 rounded-full bg-primary/20 opacity-0 transition-opacity group-hover/composer-resize-handle:opacity-100 group-focus/composer-resize-handle:opacity-100 group-data-[resizing=true]/composer-resize-handle:bg-primary/35 group-data-[resizing=true]/composer-resize-handle:opacity-100" />
            </div>
            <ChatInputExpandCorner hasCustomHeight={hasCustomHeight} onToggle={toggleExpanded} />
            <ChatFilePreviewList
              selectedFiles={chatInput.selectedFiles}
              onRemove={handlers.removeSelectedFile}
              onCancelUpload={chatInput.onCancelUpload}
              onConfigure={localFileState.handleConfigureFile}
              onMoveTextToInput={localFileState.handleMoveTextFileToInput}
              onPreview={localFileState.handlePreviewFile}
              isGemini3={capabilities.isGemini3}
            />

            <ChatQuoteDisplay
              quotes={inputState.quotes}
              onRemoveQuote={(index: number) => inputState.setQuotes((prev) => prev.filter((_, i) => i !== index))}
              themeId={chatInput.themeId}
            />

            <div
              ref={frameRef}
              data-composer-editor-frame=""
              className="min-w-0 overflow-hidden transition-[height] ease-out"
              onTransitionEnd={handleTransitionEnd}
              style={frameStyle}
            >
              <ChatTextArea
                textareaRef={inputState.textareaRef}
                value={inputState.inputText}
                onChange={handlers.handleInputChange}
                onKeyDown={handlers.handleKeyDown}
                onPaste={handlers.handlePaste}
                onCompositionStart={handlers.onCompositionStart}
                onCompositionEnd={handlers.onCompositionEnd}
                placeholder={t('chatInputPlaceholder')}
                disabled={inputDisabled}
                isFullscreen={isFullscreen}
                hasCustomHeight={hasCustomHeight}
                isMobile={isMobile}
                initialTextareaHeight={initialTextareaHeight}
                isConverting={isConverting}
              />
            </div>

            <div className={actionsContainerClass}>
              <ChatInputActions />
              <HiddenFileInputs fileInputs={fileInputState} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
