/**
 * AI Provider Configuration
 * 
 * This module manages the configuration for all AI providers used in the
 * resume optimization system. It provides:
 * 
 * 1. Default configurations for each provider
 * 2. Environment variable loading and validation
 * 3. Runtime provider status checking
 * 
 * The configuration can be accessed throughout the application to ensure
 * consistent settings across all optimization services.
 */

import { ProvidersConfig } from '../types';

// Default configuration for all providers
const DEFAULT_CONFIG: ProvidersConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    enabled: true,
    model: 'gpt-3.5-turbo',
    maxTokens: 4096,
    temperature: 0.5,
    timeout: 30000, // 30 seconds
    retries: 2
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
    enabled: true,
    model: 'gemini-pro',
    maxTokens: 4096,
    temperature: 0.4,
    timeout: 30000, // 30 seconds
    retries: 2
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    enabled: true,
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4096,
    temperature: 0.5,
    timeout: 30000, // 30 seconds
    retries: 1
  }
};

/**
 * Runtime configuration (can be modified at runtime if needed)
 */
let runtimeConfig: ProvidersConfig = validateConfig(DEFAULT_CONFIG);

/**
 * Get the current provider configuration
 * 
 * @returns Current provider configuration
 */
export function getProviderConfig(): ProvidersConfig {
  return runtimeConfig;
}

/**
 * Update the provider configuration at runtime
 * 
 * @param newConfig - New configuration to apply
 * @returns Updated configuration
 */
export function updateProviderConfig(newConfig: Partial<ProvidersConfig>): ProvidersConfig {
  // Merge with existing config
  runtimeConfig = {
    ...runtimeConfig,
    ...newConfig,
    // Deep merge provider-specific configs
    openai: { ...runtimeConfig.openai, ...(newConfig.openai || {}) },
    gemini: { ...runtimeConfig.gemini, ...(newConfig.gemini || {}) },
    claude: { ...runtimeConfig.claude, ...(newConfig.claude || {}) }
  };
  
  // Revalidate the merged config
  runtimeConfig = validateConfig(runtimeConfig);
  
  return runtimeConfig;
}

/**
 * Validate provider configuration and disable providers with missing API keys
 * 
 * @param config - Provider configuration to validate
 * @returns Validated configuration with appropriate enabled flags
 */
function validateConfig(config: ProvidersConfig): ProvidersConfig {
  const validatedConfig = { ...config };
  
  // Validate OpenAI
  if (!validatedConfig.openai.apiKey || validatedConfig.openai.apiKey.trim() === '') {
    console.warn('OpenAI API key is missing or empty. Disabling OpenAI provider.');
    validatedConfig.openai.enabled = false;
  }
  
  // Validate Gemini
  if (!validatedConfig.gemini.apiKey || validatedConfig.gemini.apiKey.trim() === '') {
    console.warn('Gemini API key is missing or empty. Disabling Gemini provider.');
    validatedConfig.gemini.enabled = false;
  }
  
  // Validate Claude
  if (!validatedConfig.claude.apiKey || validatedConfig.claude.apiKey.trim() === '') {
    console.warn('Claude API key is missing or empty. Disabling Claude provider.');
    validatedConfig.claude.enabled = false;
  }
  
  return validatedConfig;
}

/**
 * Check if a specific provider is available
 * 
 * @param providerName - Name of the provider to check
 * @returns Boolean indicating if the provider is available
 */
export function isProviderAvailable(providerName: 'openai' | 'gemini' | 'claude'): boolean {
  return runtimeConfig[providerName].enabled;
}

/**
 * Check which providers are available
 * 
 * @returns Object indicating availability of each provider
 */
export function getAvailableProviders(): Record<string, boolean> {
  return {
    openai: runtimeConfig.openai.enabled,
    gemini: runtimeConfig.gemini.enabled,
    claude: runtimeConfig.claude.enabled
  };
}

/**
 * Get the first available provider
 * Follows priority order: OpenAI > Gemini > Claude
 * 
 * @returns Name of the first available provider or null if none are available
 */
export function getFirstAvailableProvider(): 'openai' | 'gemini' | 'claude' | null {
  if (runtimeConfig.openai.enabled) return 'openai';
  if (runtimeConfig.gemini.enabled) return 'gemini';
  if (runtimeConfig.claude.enabled) return 'claude';
  return null;
}