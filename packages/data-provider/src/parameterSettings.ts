import {
  Verbosity,
  ImageDetail,
  EModelEndpoint,
  openAISettings,
  googleSettings,
  ReasoningEffort,
  ReasoningSummary,
  anthropicSettings,
} from './types';
import { SettingDefinition, SettingsConfiguration } from './generate';

// Base definitions
const baseDefinitions: Record<string, SettingDefinition> = {
  model: {
    key: 'model',
    label: 'com_ui_model',
    labelCode: true,
    type: 'string',
    component: 'dropdown',
    optionType: 'model',
    selectPlaceholder: 'com_ui_select_model',
    searchPlaceholder: 'com_ui_select_search_model',
    searchPlaceholderCode: true,
    selectPlaceholderCode: true,
    columnSpan: 4,
  },
  temperature: {
    key: 'temperature',
    label: 'com_endpoint_temperature',
    labelCode: true,
    description: 'com_endpoint_openai_temp',
    descriptionCode: true,
    type: 'number',
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  topP: {
    key: 'topP',
    label: 'com_endpoint_top_p',
    labelCode: true,
    description: 'com_endpoint_anthropic_topp',
    descriptionCode: true,
    type: 'number',
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  stop: {
    key: 'stop',
    label: 'com_endpoint_stop',
    labelCode: true,
    description: 'com_endpoint_openai_stop',
    descriptionCode: true,
    placeholder: 'com_endpoint_stop_placeholder',
    placeholderCode: true,
    type: 'array',
    default: [],
    component: 'tags',
    optionType: 'conversation',
    minTags: 0,
    maxTags: 4,
  },
  imageDetail: {
    key: 'imageDetail',
    label: 'com_endpoint_plug_image_detail',
    labelCode: true,
    description: 'com_endpoint_openai_detail',
    descriptionCode: true,
    type: 'enum',
    default: ImageDetail.auto,
    component: 'slider',
    options: [ImageDetail.low, ImageDetail.auto, ImageDetail.high],
    enumMappings: {
      [ImageDetail.low]: 'com_ui_low',
      [ImageDetail.auto]: 'com_ui_auto',
      [ImageDetail.high]: 'com_ui_high',
    },
    optionType: 'conversation',
    columnSpan: 2,
  },
};

const createDefinition = (
  base: Partial<SettingDefinition>,
  overrides: Partial<SettingDefinition>,
): SettingDefinition => {
  return { ...base, ...overrides } as SettingDefinition;
};

export const librechat = {
  modelLabel: {
    key: 'modelLabel',
    label: 'com_endpoint_custom_name',
    labelCode: true,
    type: 'string',
    default: '',
    component: 'input',
    placeholder: 'com_endpoint_openai_custom_name_placeholder',
    placeholderCode: true,
    optionType: 'conversation',
  } as const,
  maxContextTokens: {
    key: 'maxContextTokens',
    label: 'com_endpoint_context_tokens',
    labelCode: true,
    type: 'number',
    component: 'input',
    placeholder: 'com_nav_theme_system',
    placeholderCode: true,
    description: 'com_endpoint_context_info',
    descriptionCode: true,
    optionType: 'model',
    columnSpan: 2,
  } as const,
  resendFiles: {
    key: 'resendFiles',
    label: 'com_endpoint_plug_resend_files',
    labelCode: true,
    description: 'com_endpoint_openai_resend_files',
    descriptionCode: true,
    type: 'boolean',
    default: true,
    component: 'switch',
    optionType: 'conversation',
    showDefault: false,
    columnSpan: 2,
  } as const,
  promptPrefix: {
    key: 'promptPrefix',
    label: 'com_endpoint_prompt_prefix',
    labelCode: true,
    type: 'string',
    default: '',
    component: 'textarea',
    placeholder: 'com_endpoint_openai_prompt_prefix_placeholder',
    placeholderCode: true,
    optionType: 'model',
  } as const,
  fileTokenLimit: {
    key: 'fileTokenLimit',
    label: 'com_ui_file_token_limit',
    labelCode: true,
    description: 'com_ui_file_token_limit_desc',
    descriptionCode: true,
    placeholder: 'com_nav_theme_system',
    placeholderCode: true,
    type: 'number',
    component: 'input',
    columnSpan: 2,
  } as const,
};

const openAIParams: Record<string, SettingDefinition> = {
  chatGptLabel: {
    ...librechat.modelLabel,
    key: 'chatGptLabel',
  },
  promptPrefix: librechat.promptPrefix,
  temperature: createDefinition(baseDefinitions.temperature, {
    default: openAISettings.temperature.default,
    range: {
      min: openAISettings.temperature.min,
      max: openAISettings.temperature.max,
      step: openAISettings.temperature.step,
    },
  }),
  top_p: createDefinition(baseDefinitions.topP, {
    key: 'top_p',
    default: openAISettings.top_p.default,
    range: {
      min: openAISettings.top_p.min,
      max: openAISettings.top_p.max,
      step: openAISettings.top_p.step,
    },
  }),
  frequency_penalty: {
    key: 'frequency_penalty',
    label: 'com_endpoint_frequency_penalty',
    labelCode: true,
    description: 'com_endpoint_openai_freq',
    descriptionCode: true,
    type: 'number',
    default: openAISettings.frequency_penalty.default,
    range: {
      min: openAISettings.frequency_penalty.min,
      max: openAISettings.frequency_penalty.max,
      step: openAISettings.frequency_penalty.step,
    },
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  presence_penalty: {
    key: 'presence_penalty',
    label: 'com_endpoint_presence_penalty',
    labelCode: true,
    description: 'com_endpoint_openai_pres',
    descriptionCode: true,
    type: 'number',
    default: openAISettings.presence_penalty.default,
    range: {
      min: openAISettings.presence_penalty.min,
      max: openAISettings.presence_penalty.max,
      step: openAISettings.presence_penalty.step,
    },
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  max_tokens: {
    key: 'max_tokens',
    label: 'com_endpoint_max_output_tokens',
    labelCode: true,
    type: 'number',
    component: 'input',
    description: 'com_endpoint_openai_max_tokens',
    descriptionCode: true,
    placeholder: 'com_nav_theme_system',
    placeholderCode: true,
    optionType: 'model',
    columnSpan: 2,
  },
  reasoning_effort: {
    key: 'reasoning_effort',
    label: 'com_endpoint_reasoning_effort',
    labelCode: true,
    description: 'com_endpoint_openai_reasoning_effort',
    descriptionCode: true,
    type: 'enum',
    default: ReasoningEffort.none,
    component: 'slider',
    options: [
      ReasoningEffort.none,
      ReasoningEffort.minimal,
      ReasoningEffort.low,
      ReasoningEffort.medium,
      ReasoningEffort.high,
    ],
    enumMappings: {
      [ReasoningEffort.none]: 'com_ui_none',
      [ReasoningEffort.minimal]: 'com_ui_minimal',
      [ReasoningEffort.low]: 'com_ui_low',
      [ReasoningEffort.medium]: 'com_ui_medium',
      [ReasoningEffort.high]: 'com_ui_high',
    },
    optionType: 'model',
    columnSpan: 4,
  },
  useResponsesApi: {
    key: 'useResponsesApi',
    label: 'com_endpoint_use_responses_api',
    labelCode: true,
    description: 'com_endpoint_openai_use_responses_api',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  },
  web_search: {
    key: 'web_search',
    label: 'com_ui_web_search',
    labelCode: true,
    description: 'com_endpoint_openai_use_web_search',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  },
  reasoning_summary: {
    key: 'reasoning_summary',
    label: 'com_endpoint_reasoning_summary',
    labelCode: true,
    description: 'com_endpoint_openai_reasoning_summary',
    descriptionCode: true,
    type: 'enum',
    default: ReasoningSummary.none,
    component: 'slider',
    options: [
      ReasoningSummary.none,
      ReasoningSummary.auto,
      ReasoningSummary.concise,
      ReasoningSummary.detailed,
    ],
    enumMappings: {
      [ReasoningSummary.none]: 'com_ui_none',
      [ReasoningSummary.auto]: 'com_ui_auto',
      [ReasoningSummary.concise]: 'com_ui_concise',
      [ReasoningSummary.detailed]: 'com_ui_detailed',
    },
    optionType: 'model',
    columnSpan: 4,
  },
  verbosity: {
    key: 'verbosity',
    label: 'com_endpoint_verbosity',
    labelCode: true,
    description: 'com_endpoint_openai_verbosity',
    descriptionCode: true,
    type: 'enum',
    default: Verbosity.none,
    component: 'slider',
    options: [Verbosity.none, Verbosity.low, Verbosity.medium, Verbosity.high],
    enumMappings: {
      [Verbosity.none]: 'com_ui_none',
      [Verbosity.low]: 'com_ui_low',
      [Verbosity.medium]: 'com_ui_medium',
      [Verbosity.high]: 'com_ui_high',
    },
    optionType: 'model',
    columnSpan: 4,
  },
  disableStreaming: {
    key: 'disableStreaming',
    label: 'com_endpoint_disable_streaming_label',
    labelCode: true,
    description: 'com_endpoint_disable_streaming',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  } as const,
};

const anthropic: Record<string, SettingDefinition> = {
  maxOutputTokens: {
    key: 'maxOutputTokens',
    label: 'com_endpoint_max_output_tokens',
    labelCode: true,
    type: 'number',
    component: 'input',
    description: 'com_endpoint_anthropic_maxoutputtokens',
    descriptionCode: true,
    placeholder: 'com_nav_theme_system',
    placeholderCode: true,
    range: {
      min: anthropicSettings.maxOutputTokens.min,
      max: anthropicSettings.maxOutputTokens.max,
      step: anthropicSettings.maxOutputTokens.step,
    },
    optionType: 'model',
    columnSpan: 2,
  },
  temperature: createDefinition(baseDefinitions.temperature, {
    default: anthropicSettings.temperature.default,
    range: {
      min: anthropicSettings.temperature.min,
      max: anthropicSettings.temperature.max,
      step: anthropicSettings.temperature.step,
    },
  }),
  topP: createDefinition(baseDefinitions.topP, {
    default: anthropicSettings.topP.default,
    range: {
      min: anthropicSettings.topP.min,
      max: anthropicSettings.topP.max,
      step: anthropicSettings.topP.step,
    },
  }),
  topK: {
    key: 'topK',
    label: 'com_endpoint_top_k',
    labelCode: true,
    description: 'com_endpoint_anthropic_topk',
    descriptionCode: true,
    type: 'number',
    default: anthropicSettings.topK.default,
    range: {
      min: anthropicSettings.topK.min,
      max: anthropicSettings.topK.max,
      step: anthropicSettings.topK.step,
    },
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  promptCache: {
    key: 'promptCache',
    label: 'com_endpoint_prompt_cache',
    labelCode: true,
    description: 'com_endpoint_anthropic_prompt_cache',
    descriptionCode: true,
    type: 'boolean',
    default: anthropicSettings.promptCache.default,
    component: 'switch',
    optionType: 'conversation',
    showDefault: false,
    columnSpan: 2,
  },
  thinking: {
    key: 'thinking',
    label: 'com_endpoint_thinking',
    labelCode: true,
    description: 'com_endpoint_anthropic_thinking',
    descriptionCode: true,
    type: 'boolean',
    default: anthropicSettings.thinking.default,
    component: 'switch',
    optionType: 'conversation',
    showDefault: false,
    columnSpan: 2,
  },
  thinkingBudget: {
    key: 'thinkingBudget',
    label: 'com_endpoint_thinking_budget',
    labelCode: true,
    description: 'com_endpoint_anthropic_thinking_budget',
    descriptionCode: true,
    type: 'number',
    component: 'input',
    default: anthropicSettings.thinkingBudget.default,
    range: {
      min: anthropicSettings.thinkingBudget.min,
      max: anthropicSettings.thinkingBudget.max,
      step: anthropicSettings.thinkingBudget.step,
    },
    optionType: 'conversation',
    columnSpan: 2,
  },
  web_search: {
    key: 'web_search',
    label: 'com_ui_web_search',
    labelCode: true,
    description: 'com_endpoint_anthropic_use_web_search',
    descriptionCode: true,
    type: 'boolean',
    default: anthropicSettings.web_search.default,
    component: 'switch',
    optionType: 'conversation',
    showDefault: false,
    columnSpan: 2,
  },
};

const mistral: Record<string, SettingDefinition> = {
  temperature: createDefinition(baseDefinitions.temperature, {
    default: 0.7,
    range: { min: 0, max: 1, step: 0.01 },
  }),
  topP: createDefinition(baseDefinitions.topP, {
    range: { min: 0, max: 1, step: 0.01 },
  }),
};

const cohere: Record<string, SettingDefinition> = {
  temperature: createDefinition(baseDefinitions.temperature, {
    default: 0.3,
    range: { min: 0, max: 1, step: 0.01 },
  }),
  topP: createDefinition(baseDefinitions.topP, {
    default: 0.75,
    range: { min: 0.01, max: 0.99, step: 0.01 },
  }),
};

const meta: Record<string, SettingDefinition> = {
  temperature: createDefinition(baseDefinitions.temperature, {
    default: 0.5,
    range: { min: 0, max: 1, step: 0.01 },
  }),
  topP: createDefinition(baseDefinitions.topP, {
    default: 0.9,
    range: { min: 0, max: 1, step: 0.01 },
  }),
};

const google: Record<string, SettingDefinition> = {
  temperature: createDefinition(baseDefinitions.temperature, {
    default: googleSettings.temperature.default,
    range: {
      min: googleSettings.temperature.min,
      max: googleSettings.temperature.max,
      step: googleSettings.temperature.step,
    },
  }),
  topP: createDefinition(baseDefinitions.topP, {
    default: googleSettings.topP.default,
    range: {
      min: googleSettings.topP.min,
      max: googleSettings.topP.max,
      step: googleSettings.topP.step,
    },
  }),
  topK: {
    key: 'topK',
    label: 'com_endpoint_top_k',
    labelCode: true,
    description: 'com_endpoint_google_topk',
    descriptionCode: true,
    type: 'number',
    default: googleSettings.topK.default,
    range: {
      min: googleSettings.topK.min,
      max: googleSettings.topK.max,
      step: googleSettings.topK.step,
    },
    component: 'slider',
    optionType: 'model',
    columnSpan: 4,
  },
  maxOutputTokens: {
    key: 'maxOutputTokens',
    label: 'com_endpoint_max_output_tokens',
    labelCode: true,
    type: 'number',
    component: 'input',
    description: 'com_endpoint_google_maxoutputtokens',
    descriptionCode: true,
    placeholder: 'com_nav_theme_system',
    placeholderCode: true,
    default: googleSettings.maxOutputTokens.default,
    range: {
      min: googleSettings.maxOutputTokens.min,
      max: googleSettings.maxOutputTokens.max,
      step: googleSettings.maxOutputTokens.step,
    },
    optionType: 'model',
    columnSpan: 2,
  },
  thinking: {
    key: 'thinking',
    label: 'com_endpoint_thinking',
    labelCode: true,
    description: 'com_endpoint_google_thinking',
    descriptionCode: true,
    type: 'boolean',
    default: googleSettings.thinking.default,
    component: 'switch',
    optionType: 'conversation',
    showDefault: false,
    columnSpan: 2,
  },
  thinkingBudget: {
    key: 'thinkingBudget',
    label: 'com_endpoint_thinking_budget',
    labelCode: true,
    description: 'com_endpoint_google_thinking_budget',
    descriptionCode: true,
    placeholder: 'com_ui_auto',
    placeholderCode: true,
    type: 'number',
    component: 'input',
    range: {
      min: googleSettings.thinkingBudget.min,
      max: googleSettings.thinkingBudget.max,
      step: googleSettings.thinkingBudget.step,
    },
    optionType: 'conversation',
    columnSpan: 2,
  },
  web_search: {
    key: 'web_search',
    label: 'com_endpoint_use_search_grounding',
    labelCode: true,
    description: 'com_endpoint_google_use_search_grounding',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  },
};

const googleConfig: SettingsConfiguration = [
  librechat.modelLabel,
  librechat.promptPrefix,
  librechat.maxContextTokens,
  google.maxOutputTokens,
  google.temperature,
  google.topP,
  google.topK,
  librechat.resendFiles,
  google.thinking,
  google.thinkingBudget,
  google.web_search,
  librechat.fileTokenLimit,
];

const googleCol1: SettingsConfiguration = [
  baseDefinitions.model as SettingDefinition,
  librechat.modelLabel,
  librechat.promptPrefix,
];

const googleCol2: SettingsConfiguration = [
  librechat.maxContextTokens,
  google.maxOutputTokens,
  google.temperature,
  google.topP,
  google.topK,
  librechat.resendFiles,
  google.thinking,
  google.thinkingBudget,
  google.web_search,
  librechat.fileTokenLimit,
];

const openAI: SettingsConfiguration = [
  librechat.modelLabel,
  librechat.promptPrefix,
  librechat.maxContextTokens,
  openAIParams.max_tokens,
  openAIParams.temperature,
  openAIParams.top_p,
  openAIParams.frequency_penalty,
  openAIParams.presence_penalty,
  baseDefinitions.stop,
  librechat.resendFiles,
  baseDefinitions.imageDetail,
  openAIParams.web_search,
  openAIParams.reasoning_effort,
  openAIParams.useResponsesApi,
  openAIParams.reasoning_summary,
  openAIParams.verbosity,
  openAIParams.disableStreaming,
  librechat.fileTokenLimit,
];

const openAICol1: SettingsConfiguration = [
  baseDefinitions.model as SettingDefinition,
  librechat.modelLabel,
  librechat.promptPrefix,
];

const openAICol2: SettingsConfiguration = [
  librechat.maxContextTokens,
  openAIParams.max_tokens,
  openAIParams.temperature,
  openAIParams.top_p,
  openAIParams.frequency_penalty,
  openAIParams.presence_penalty,
  baseDefinitions.stop,
  librechat.resendFiles,
  baseDefinitions.imageDetail,
  openAIParams.reasoning_effort,
  openAIParams.reasoning_summary,
  openAIParams.verbosity,
  openAIParams.useResponsesApi,
  openAIParams.web_search,
  openAIParams.disableStreaming,
  librechat.fileTokenLimit,
];

const anthropicConfig: SettingsConfiguration = [
  librechat.modelLabel,
  librechat.promptPrefix,
  librechat.maxContextTokens,
  anthropic.maxOutputTokens,
  anthropic.temperature,
  anthropic.topP,
  anthropic.topK,
  librechat.resendFiles,
  anthropic.promptCache,
  anthropic.thinking,
  anthropic.thinkingBudget,
  anthropic.web_search,
  librechat.fileTokenLimit,
];

const anthropicCol1: SettingsConfiguration = [
  baseDefinitions.model as SettingDefinition,
  librechat.modelLabel,
  librechat.promptPrefix,
];

const anthropicCol2: SettingsConfiguration = [
  librechat.maxContextTokens,
  anthropic.maxOutputTokens,
  anthropic.temperature,
  anthropic.topP,
  anthropic.topK,
  librechat.resendFiles,
  anthropic.promptCache,
  anthropic.thinking,
  anthropic.thinkingBudget,
  anthropic.web_search,
  librechat.fileTokenLimit,
];

export const paramSettings: Record<string, SettingsConfiguration | undefined> = {
  [EModelEndpoint.openAI]: openAI,
  [EModelEndpoint.azureOpenAI]: openAI,
  [EModelEndpoint.custom]: openAI,
  [EModelEndpoint.anthropic]: anthropicConfig,
  [EModelEndpoint.google]: googleConfig,
};

const openAIColumns = {
  col1: openAICol1,
  col2: openAICol2,
};

export const presetSettings: Record<
  string,
  | {
      col1: SettingsConfiguration;
      col2: SettingsConfiguration;
    }
  | undefined
> = {
  [EModelEndpoint.openAI]: openAIColumns,
  [EModelEndpoint.azureOpenAI]: openAIColumns,
  [EModelEndpoint.custom]: openAIColumns,
  [EModelEndpoint.anthropic]: {
    col1: anthropicCol1,
    col2: anthropicCol2,
  },
  [EModelEndpoint.google]: {
    col1: googleCol1,
    col2: googleCol2,
  },
};

export const agentParamSettings: Record<string, SettingsConfiguration | undefined> = Object.entries(
  presetSettings,
).reduce<Record<string, SettingsConfiguration | undefined>>((acc, [key, value]) => {
  if (value) {
    acc[key] = value.col2;
  }
  return acc;
}, {});
