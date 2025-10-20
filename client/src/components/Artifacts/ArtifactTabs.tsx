import { useRef, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Artifact } from '~/common';
import { useEditorContext, useArtifactsContext } from '~/Providers';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useAutoScroll } from '~/hooks/Artifacts/useAutoScroll';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { useGetStartupConfig } from '~/data-provider';
import { cn } from '~/utils';

export default function ArtifactTabs({
  artifact,
  editorRef,
  activeTab,
  setActiveTab,
}: {
  artifact: Artifact;
  editorRef: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const { isSubmitting } = useArtifactsContext();
  const { currentCode, setCurrentCode } = useEditorContext();
  const { data: startupConfig } = useGetStartupConfig();
  const lastIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (artifact.id !== lastIdRef.current) {
      setCurrentCode(undefined);
    }
    lastIdRef.current = artifact.id;
  }, [setCurrentCode, artifact.id]);

  const content = artifact.content ?? '';
  const contentRef = useRef<HTMLDivElement>(null);
  useAutoScroll({ ref: contentRef, content, isSubmitting });
  const { files, fileKey } = useArtifactProps({ artifact });
  
  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex h-full w-full">
      <Tabs.List className="flex border-b border-border-light">
        <Tabs.Trigger
          value="code"
          className="px-4 py-2 text-sm font-medium text-text-secondary data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-text-primary"
        >
          Code
        </Tabs.Trigger>
      </Tabs.List>
      
      <Tabs.Content
        ref={contentRef}
        value="code"
        id="artifacts-code"
        className={cn('flex-grow overflow-auto')}
        tabIndex={-1}
      >
        <ArtifactCodeEditor
          fileKey={fileKey}
          artifact={artifact}
          readOnly={isSubmitting}
        />
      </Tabs.Content>
    </Tabs.Root>
  );
}
