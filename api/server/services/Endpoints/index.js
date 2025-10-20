const { Providers } = require('@librechat/agents');
const { EModelEndpoint } = require('librechat-data-provider');
const { getCustomEndpointConfig } = require('@librechat/api');
const initAnthropic = require('~/server/services/Endpoints/anthropic/initialize');
const initOpenAI = require('~/server/services/Endpoints/openAI/initialize');
const initCustom = require('~/server/services/Endpoints/custom/initialize');
const initGoogle = require('~/server/services/Endpoints/google/initialize');

/** Check if the provider is a known custom provider
 * @param {string | undefined} [provider] - The provider string
 * @returns {boolean} - True if the provider is a known custom provider, false otherwise
 */
function isKnownCustomProvider(provider) {
  // Removed: XAI, OLLAMA, DEEPSEEK, OPENROUTER providers
  return false;
}

const providerConfigMap = {
  // Removed: XAI, OLLAMA, DEEPSEEK, OPENROUTER providers
  [EModelEndpoint.openAI]: initOpenAI,
  [EModelEndpoint.google]: initGoogle,
  [EModelEndpoint.azureOpenAI]: initOpenAI,
  [EModelEndpoint.anthropic]: initAnthropic,
  // Removed: bedrock provider
};

/**
 * Get the provider configuration and override endpoint based on the provider string
 * @param {Object} params
 * @param {string} params.provider - The provider string
 * @param {AppConfig} params.appConfig - The application configuration
 * @returns {{
 * getOptions: (typeof providerConfigMap)[keyof typeof providerConfigMap],
 * overrideProvider: string,
 * customEndpointConfig?: TEndpoint
 * }}
 */
function getProviderConfig({ provider, appConfig }) {
  let getOptions = providerConfigMap[provider];
  let overrideProvider = provider;
  /** @type {TEndpoint | undefined} */
  let customEndpointConfig;

  if (!getOptions && providerConfigMap[provider.toLowerCase()] != null) {
    overrideProvider = provider.toLowerCase();
    getOptions = providerConfigMap[overrideProvider];
  } else if (!getOptions) {
    customEndpointConfig = getCustomEndpointConfig({ endpoint: provider, appConfig });
    if (!customEndpointConfig) {
      throw new Error(`Provider ${provider} not supported`);
    }
    getOptions = initCustom;
    overrideProvider = Providers.OPENAI;
  }

  // Removed check for known custom providers since they're no longer supported

  return {
    getOptions,
    overrideProvider,
    customEndpointConfig,
  };
}

module.exports = {
  getProviderConfig,
};
