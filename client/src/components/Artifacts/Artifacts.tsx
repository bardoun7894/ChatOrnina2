import { useRef, useState, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
// Removed Sandpack references
import useArtifacts from '~/hooks/Artifacts/useArtifacts';
import DownloadArtifact from './DownloadArtifact';
import { useEditorContext } from '~/Providers';
import ArtifactTabs from './ArtifactTabs';
import { CopyCodeButton } from './Code';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export default function Artifacts() {
  const localize = useLocalize();
  const { isMutating } = useEditorContext();
  // Removed SandpackPreviewRef
  const editorRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  // Removed isRefreshing and previewRef
  const setArtifactsVisible = useSetRecoilState(store.artifactsVisibility);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const {
    activeTab,
    setActiveTab,
    currentIndex,
    cycleArtifact,
    currentArtifact,
    orderedArtifactIds,
  } = useArtifacts();

  if (currentArtifact === null || currentArtifact === undefined) {
    return null;
  }

  // Removed handleRefresh function as it was Sandpack-specific

  const closeArtifacts = () => {
    setArtifactsVisible(false);
  };

  const handlePrevious = () => {
    cycleArtifact('prev');
  };

  const handleNext = () => {
    cycleArtifact('next');
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-96 flex-col border-t border-border-light bg-surface-primary-alt transition-transform duration-300 md:left-20',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex items-center justify-between border-b border-border-light px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1 hover:bg-surface-secondary"
            onClick={closeArtifacts}
            aria-label={localize('com_ui_close')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-medium">{localize('com_artifacts')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {orderedArtifactIds.length > 1 && (
            <>
              <button
                className="rounded-md p-1 hover:bg-surface-secondary disabled:opacity-50"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                aria-label={localize('com_ui_previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-text-secondary">
                {currentIndex + 1} / {orderedArtifactIds.length}
              </span>
              <button
                className="rounded-md p-1 hover:bg-surface-secondary disabled:opacity-50"
                onClick={handleNext}
                disabled={currentIndex === orderedArtifactIds.length - 1}
                aria-label={localize('com_ui_next')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <DownloadArtifact artifact={currentArtifact} />
          <button
            className="rounded-md p-1 hover:bg-surface-secondary"
            onClick={closeArtifacts}
            aria-label={localize('com_ui_close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <ArtifactTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          artifact={currentArtifact}
          editorRef={editorRef}
        />
      </div>
    </div>
  );
}
