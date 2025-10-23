import { EModelEndpoint, agentsEndpointSchema } from 'librechat-data-provider';
import type { TCustomConfig, TAgentsEndpoint } from 'librechat-data-provider';

/**
 * Sets up the Agents configuration from the config (`librechat.yaml`) file.
 * If no agents config is defined, uses the provided defaults or parses empty object.
 *
 * @param config - The loaded custom configuration.
 * @param [defaultConfig] - Default configuration from getConfigDefaults.
 * @returns The Agents endpoint configuration.
 */
export function agentsConfigSetup(
  config: Partial<TCustomConfig>,
  defaultConfig?: Partial<TAgentsEndpoint>,
): Partial<TAgentsEndpoint> {
  // Agents have been removed, return empty config
  return defaultConfig || {};
}
