export * from './Audio';
export * from './Assistants';
export * from './Chat';
export * from './Config';
export * from './Conversations';
export * from './Nav';
export * from './Files';
export * from './Generic';
export * from './Input';
export * from './MCP';
export * from './Messages';
export * from './Plugins';
export * from './Prompts';
export * from './Roles';
export * from './Sharing';
export * from './SSE';
export * from './AuthContext';
export * from './ScreenshotContext';
export * from './ApiErrorBoundaryContext';
export * from './Endpoint';

// Agent stubs
export const useAgentsMap = () => ({});
export const useAgentsMapContext = () => ({});
export const useAgentDefaultPermissionLevel = () => 'write';
export const useAgentToolPermissions = () => ({ fileSearchAllowedByAgent: true, codeAllowedByAgent: true, provider: 'openai' });
export const useAgentCapabilities = () => ({});
export const useGetAgentFiles = () => ({});
export const useFileHandling = () => ({});
export const useCodeApiKeyForm = () => ({});
export const useSearchApiKeyForm = () => ({});
export const useMCPServerManager = () => ({});
export const useToolToggle = () => ({});

// AgentCapabilities enum stub
export const AgentCapabilities = {
  file_search: 'file_search',
  execute_code: 'execute_code',
  web_search: 'web_search',
  artifacts: 'artifacts',
  actions: 'actions',
  context: 'context',
  tools: 'tools',
  chain: 'chain',
  ocr: 'ocr',
};

// defaultAgentCapabilities stub
export const defaultAgentCapabilities = [
  AgentCapabilities.file_search,
  AgentCapabilities.execute_code,
  AgentCapabilities.web_search,
  AgentCapabilities.artifacts,
  AgentCapabilities.actions,
  AgentCapabilities.context,
  AgentCapabilities.tools,
  AgentCapabilities.chain,
  AgentCapabilities.ocr,
];

export type { TranslationKeys } from './useLocalize';

export { default as useTimeout } from './useTimeout';
export { default as useNewConvo } from './useNewConvo';
export { default as useLocalize } from './useLocalize';
export { default as useChatBadges } from './useChatBadges';

// Additional stubs for missing hooks
export const useScrollToRef = () => ({});
export const useLocalStorage = () => [false, () => {}];
export const useDocumentTitle = () => ({});
export const useSpeechToText = () => ({});
export const useTextToSpeech = () => ({});
export const useGenerationsByLatest = () => ({});
export const useResourcePermissions = () => ({});
export const useHasAccess = () => true;
