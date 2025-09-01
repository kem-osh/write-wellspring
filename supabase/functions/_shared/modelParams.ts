export function mapParams(model: string, maxTokens: number | undefined, temperature: number | undefined) {
  const isNewerModel = model?.includes('gpt-5') || model?.includes('gpt-4.1') || model?.includes('o3') || model?.includes('o4');
  
  if (isNewerModel) {
    return { 
      tokenKey: 'max_completion_tokens', 
      tokens: Math.min(maxTokens ?? 1500, 4096), 
      includeTemp: false 
    };
  }
  
  return { 
    tokenKey: 'max_tokens', 
    tokens: Math.min(maxTokens ?? 1500, 4096), 
    includeTemp: temperature ?? 0.5 
  };
}