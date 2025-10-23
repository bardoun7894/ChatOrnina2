import React, { useMemo } from 'react';
import type { ModelSelectorProps } from '~/common';
import { ModelSelectorProvider, useModelSelectorContext } from './ModelSelectorContext';
import { ModelSelectorChatProvider } from './ModelSelectorChatContext';
import {
  renderModelSpecs,
  renderEndpoints,
  renderSearchResults,
  renderCustomGroups,
} from './components';
import { getSelectedIcon, getDisplayValue } from './utils';
import { CustomMenu as Menu } from './CustomMenu';
import DialogManager from './DialogManager';
import { useLocalize } from '~/hooks';
import { Image, Video, Palette } from 'lucide-react';

function ModelSelectorContent() {
  const localize = useLocalize();

  const {
    // LibreChat
    agentsMap,
    modelSpecs,
    mappedEndpoints,
    endpointsConfig,
    // State
    searchValue,
    searchResults,
    selectedValues,

    // Functions
    setSearchValue,
    setSelectedValues,
    // Dialog
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
  } = useModelSelectorContext();

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig],
  );
  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        agentsMap,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, agentsMap, modelSpecs, selectedValues, mappedEndpoints],
  );

  const trigger = (
    <button
      className="my-1 flex h-10 w-full max-w-[70vw] items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary"
      aria-label={localize('com_ui_select_model')}
    >
      {selectedIcon && React.isValidElement(selectedIcon) && (
        <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
          {selectedIcon}
        </div>
      )}
      <span className="flex-grow truncate text-left">{selectedDisplayValue}</span>
    </button>
  );

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-2">
      <Menu
        values={selectedValues}
        onValuesChange={(values: Record<string, any>) => {
          setSelectedValues({
            endpoint: values.endpoint || '',
            model: values.model || '',
            modelSpec: values.modelSpec || '',
          });
        }}
        onSearch={(value) => setSearchValue(value)}
        combobox={<input placeholder={localize('com_endpoint_search_models')} />}
        trigger={trigger}
      >
        {searchResults ? (
          renderSearchResults(searchResults, localize, searchValue)
        ) : (
          <>
            {/* AI Tools Section */}
            <div className="border-t border-border-light my-1 pt-1">
              <div className="px-2 py-1 text-xs font-medium text-text-secondary uppercase">
                {localize('com_ui_ai_tools')}
              </div>
              <div className="px-1 py-1">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded-md cursor-pointer"
                  onClick={() => {
                    console.log('Image Generation selected');
                    // Here you would implement the image generation functionality
                  }}
                >
                  <Image size={16} />
                  <span>{localize('com_ui_image_generation')}</span>
                </div>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded-md cursor-pointer"
                  onClick={() => {
                    console.log('Video Generation selected');
                    // Here you would implement the video generation functionality
                  }}
                >
                  <Video size={16} />
                  <span>{localize('com_ui_video_generation')}</span>
                </div>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded-md cursor-pointer"
                  onClick={() => {
                    console.log('Audio Generation selected');
                    // Here you would implement the audio generation functionality
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18C13.1046 18 14 17.1046 14 16C14 14.8954 13.1046 14 12 14C10.8954 14 10 14.8954 10 16C10 17.1046 10.8954 18 12 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{localize('com_ui_audio_generation')}</span>
                </div>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded-md cursor-pointer"
                  onClick={() => {
                    console.log('Text Generation selected');
                    // Here you would implement the text generation functionality
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2H14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 8H8V16H16V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{localize('com_ui_text_generation')}</span>
                </div>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover rounded-md cursor-pointer"
                  onClick={() => {
                    console.log('Design Analysis selected');
                    // Here you would implement the design analysis functionality
                  }}
                >
                  <Palette size={16} />
                  <span>{localize('com_ui_design_analysis')}</span>
                </div>
              </div>
            </div>
            {/* Render ungrouped modelSpecs (no group field) */}
            {renderModelSpecs(
              modelSpecs?.filter((spec) => !spec.group) || [],
              selectedValues.modelSpec || '',
            )}
            {/* Render endpoints (will include grouped specs matching endpoint names) */}
            {renderEndpoints(mappedEndpoints ?? [])}
            {/* Render custom groups (specs with group field not matching any endpoint) */}
            {renderCustomGroups(modelSpecs || [], mappedEndpoints ?? [])}
          </>
        )}
      </Menu>
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
    </div>
  );
}

export default function ModelSelector({ startupConfig }: ModelSelectorProps) {
  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <ModelSelectorContent />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
