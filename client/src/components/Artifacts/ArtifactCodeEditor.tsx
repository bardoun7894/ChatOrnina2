import debounce from 'lodash/debounce';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
// Replaced Sandpack with Monaco Editor
import Editor from '@monaco-editor/react';
import type { ArtifactFiles, Artifact } from '~/common';
import { useEditArtifact, useGetStartupConfig } from '~/data-provider';
import { useEditorContext, useArtifactsContext } from '~/Providers';
import { useLocalize } from '~/hooks';

const createDebouncedMutation = (
  callback: (params: {
    index: number;
    messageId: string;
    original: string;
    updated: string;
  }) => void,
) => debounce(callback, 500);

const CodeEditor = ({
  fileKey,
  readOnly,
  artifact,
}: {
  fileKey: string;
  readOnly?: boolean;
  artifact: Artifact;
}) => {
  const editorRef = useRef<any>(null);
  const [currentUpdate, setCurrentUpdate] = useState<string | null>(null);
  const { isMutating, setIsMutating, setCurrentCode } = useEditorContext();
  const editArtifact = useEditArtifact({
    onMutate: (vars) => {
      setIsMutating(true);
      setCurrentUpdate(vars.updated);
    },
    onSuccess: () => {
      setIsMutating(false);
      setCurrentUpdate(null);
    },
    onError: () => {
      setIsMutating(false);
    },
  });

  const { data: startupConfig } = useGetStartupConfig();
  const { artifacts, setArtifacts } = useArtifactsContext();

  const file = artifact.files[fileKey];
  const { content = '', language = 'plaintext' } = file || {};

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value || readOnly || isMutating) {
        return;
      }

      setCurrentCode(value);
      const updatedFiles: ArtifactFiles = {
        ...artifact.files,
        [fileKey]: {
          ...file,
          content: value,
        },
      };

      setArtifacts({
        ...artifacts,
        [artifact.id]: {
          ...artifact,
          files: updatedFiles,
        },
      });

      createDebouncedMutation(editArtifact)({
        index: 0,
        messageId: artifact.messageId,
        original: content,
        updated: value,
      });
    },
    [
      artifact,
      artifacts,
      content,
      editArtifact,
      file,
      fileKey,
      isMutating,
      readOnly,
      setCurrentCode,
      setArtifacts,
    ],
  );

  const getLanguageFromExtension = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  const editorLanguage = language || getLanguageFromExtension(fileKey);

  return (
    <div className="relative flex-1 overflow-hidden">
      {currentUpdate && (
        <div className="absolute top-2 right-2 z-10 rounded bg-blue-500 px-2 py-1 text-xs text-white">
          {useLocalize('com_ui_saving')}
        </div>
      )}
      <Editor
        height="100%"
        language={editorLanguage}
        value={content}
        theme={startupConfig?.theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={handleEditorChange}
        onMount={(editor) => {
          editorRef.current = editor;
          // Configure editor options
          editor.updateOptions({
            readOnly: !!readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 2,
            wordWrap: 'on',
          });
        }}
        options={{
          readOnly: !!readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;
