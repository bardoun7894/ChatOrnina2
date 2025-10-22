import { useCallback, useMemo, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { useRecoilState } from 'recoil';
import { Constants, LocalStorageKeys } from 'librechat-data-provider';
import type { VerifyToolAuthResponse } from 'librechat-data-provider';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useVerifyAgentToolAuth } from '~/data-provider';
import { setTimestamp } from '~/utils/timestamps';
import useLocalStorage from '~/hooks/useLocalStorageAlt';

type ToolValue = boolean | string;

interface UseToolToggleOptions {
  conversationId?: string | null;
  toolKey: string;
  localStorageKey: LocalStorageKeys;
  isAuthenticated?: boolean;
  setIsDialogOpen?: (open: boolean) => void;
  /** Options for auth verification */
  authConfig?: {
    toolId: string;
    queryOptions?: UseQueryOptions<VerifyToolAuthResponse>;
  };
}

export function useToolToggle({
  conversationId,
  toolKey: _toolKey,
  localStorageKey,
  isAuthenticated: externalIsAuthenticated,
  setIsDialogOpen,
  authConfig,
}: UseToolToggleOptions) {
  const key = conversationId ?? Constants.NEW_CONVO;
  
  const authQuery = useVerifyAgentToolAuth(
    { toolId: authConfig?.toolId || '' },
    {
      enabled: !!authConfig?.toolId,
      ...authConfig?.queryOptions,
    },
  );

  const isAuthenticated = useMemo(
    () =>
      externalIsAuthenticated ?? (authConfig ? (authQuery?.data?.authenticated ?? false) : false),
    [externalIsAuthenticated, authConfig, authQuery.data?.authenticated],
  );

  const toolKey = useMemo(() => _toolKey, [_toolKey]);
  const storageKey = useMemo(() => `${localStorageKey}${key}`, [localStorageKey, key]);

  // Use localStorage directly instead of ephemeralAgent
  const [toolValue, setToolValue] = useLocalStorage<ToolValue>(storageKey, false);

  const isToolEnabled = useMemo(() => {
    // For backward compatibility, treat truthy string values as enabled
    if (typeof toolValue === 'string') {
      return toolValue.length > 0;
    }
    return toolValue === true;
  }, [toolValue]);

  const [isPinned, setIsPinned] = useLocalStorage<boolean>(`${localStorageKey}pinned`, false);

  const handleChange = useCallback(
    ({ e, value }: { e?: React.ChangeEvent<HTMLInputElement>; value: ToolValue }) => {
      if (isAuthenticated !== undefined && !isAuthenticated && setIsDialogOpen) {
        setIsDialogOpen(true);
        e?.preventDefault?.();
        setToolValue(false);
        return;
      }

      // Update localStorage (timestamps will sync automatically via effect)
      setToolValue(value);
    },
    [setIsDialogOpen, isAuthenticated, setToolValue],
  );

  const debouncedChange = useMemo(
    () => debounce(handleChange, 50, { leading: true }),
    [handleChange],
  );

  return {
    toggleState: toolValue, // Return the actual value from localStorage
    handleChange,
    isToolEnabled,
    toolValue,
    setToggleState: (value: ToolValue) => handleChange({ value }), // Adapter for direct setting
    ephemeralAgent: undefined, // No longer managing ephemeralAgent state
    debouncedChange,
    setEphemeralAgent: undefined, // No longer managing ephemeralAgent state
    authData: authQuery?.data,
    isPinned,
    setIsPinned,
  };
}
