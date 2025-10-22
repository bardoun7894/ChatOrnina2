import React, { useMemo } from 'react';
import { AuthType } from 'librechat-data-provider';
import { useBadgeRowContext } from '~/Providers';

function ToolDialogs() {
  const { webSearch, codeInterpreter, searchApiKeyForm, codeApiKeyForm } = useBadgeRowContext();
  const { authData: webSearchAuthData } = webSearch;
  const { authData: codeAuthData } = codeInterpreter;

  const {
    methods: searchMethods,
    onSubmit: searchOnSubmit,
    isDialogOpen: searchDialogOpen,
    setIsDialogOpen: setSearchDialogOpen,
    handleRevokeApiKey: searchHandleRevoke,
    badgeTriggerRef: searchBadgeTriggerRef,
    menuTriggerRef: searchMenuTriggerRef,
  } = searchApiKeyForm;

  const {
    methods: codeMethods,
    onSubmit: codeOnSubmit,
    isDialogOpen: codeDialogOpen,
    setIsDialogOpen: setCodeDialogOpen,
    handleRevokeApiKey: codeHandleRevoke,
    badgeTriggerRef: codeBadgeTriggerRef,
    menuTriggerRef: codeMenuTriggerRef,
  } = codeApiKeyForm;

  const searchAuthTypes = useMemo(
    () => webSearchAuthData?.authTypes ?? [],
    [webSearchAuthData?.authTypes],
  );
  const codeAuthType = useMemo(() => codeAuthData?.message ?? false, [codeAuthData?.message]);

  return (
    <>
      {/* Agent dialogs removed - only web search and code interpreter remain */}
      {/* Note: SearchApiKeyDialog and CodeApiKeyDialog were agent-specific components */}
      {/* These should be replaced with generic API key dialogs if needed */}
    </>
  );
}

export default ToolDialogs;
