import { useState, useCallback, useEffect } from 'react';

interface CommandUsage {
  commandId: string;
  count: number;
  lastUsed: number;
  timeOfDay: number[]; // Hour buckets (0-23)
  contextual: {
    withSelection: number;
    withoutSelection: number;
    documentLength: 'short' | 'medium' | 'long';
  };
}

interface ContextInfo {
  selectedText?: string;
  documentLength?: number;
  timeOfDay?: number;
}

const STORAGE_KEY = 'ai-command-usage';
const TIME_DECAY_FACTOR = 0.95; // How much to decay usage over time
const RECENCY_WEIGHT = 0.3; // How much recent usage matters
const CONTEXT_WEIGHT = 0.4; // How much context matching matters
const TIME_OF_DAY_WEIGHT = 0.3; // How much time-of-day patterns matter

export function useCommandRanking() {
  const [usageData, setUsageData] = useState<Record<string, CommandUsage>>({});

  // Load usage data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUsageData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading command usage data:', error);
    }
  }, []);

  // Save usage data to localStorage
  const saveUsageData = useCallback((data: Record<string, CommandUsage>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving command usage data:', error);
    }
  }, []);

  // Record command usage
  const recordUsage = useCallback((commandId: string, context?: ContextInfo) => {
    const now = Date.now();
    const hour = new Date().getHours();
    
    setUsageData(prev => {
      const existing = prev[commandId] || {
        commandId,
        count: 0,
        lastUsed: 0,
        timeOfDay: Array(24).fill(0),
        contextual: {
          withSelection: 0,
          withoutSelection: 0,
          documentLength: 'medium'
        }
      };

      const updated = {
        ...existing,
        count: existing.count + 1,
        lastUsed: now,
        timeOfDay: existing.timeOfDay.map((count, i) => 
          i === hour ? count + 1 : count
        ),
        contextual: {
          ...existing.contextual,
          withSelection: context?.selectedText 
            ? existing.contextual.withSelection + 1 
            : existing.contextual.withSelection,
          withoutSelection: !context?.selectedText 
            ? existing.contextual.withoutSelection + 1 
            : existing.contextual.withoutSelection,
          documentLength: context?.documentLength 
            ? (context.documentLength < 500 ? 'short' : 
               context.documentLength > 2000 ? 'long' : 'medium')
            : existing.contextual.documentLength
        }
      };

      const newData = { ...prev, [commandId]: updated };
      saveUsageData(newData);
      return newData;
    });
  }, [saveUsageData]);

  // Get ranked commands based on usage patterns and context
  const getRankedCommands = useCallback(<T extends { id: string; priority: number }>(
    commands: T[], 
    context?: ContextInfo
  ): T[] => {
    const now = Date.now();
    const currentHour = new Date().getHours();
    
    return [...commands].sort((a, b) => {
      const usageA = usageData[a.id];
      const usageB = usageData[b.id];
      
      // Base priority score
      let scoreA = a.priority;
      let scoreB = b.priority;
      
      // Usage frequency score (with time decay)
      if (usageA) {
        const daysSinceUsed = (now - usageA.lastUsed) / (1000 * 60 * 60 * 24);
        const decayedUsage = usageA.count * Math.pow(TIME_DECAY_FACTOR, daysSinceUsed);
        scoreA += decayedUsage * RECENCY_WEIGHT;
        
        // Time of day pattern matching
        const timeScore = usageA.timeOfDay[currentHour] / Math.max(1, usageA.count);
        scoreA += timeScore * 100 * TIME_OF_DAY_WEIGHT;
        
        // Context matching
        if (context?.selectedText) {
          const contextRatio = usageA.contextual.withSelection / 
            Math.max(1, usageA.contextual.withSelection + usageA.contextual.withoutSelection);
          scoreA += contextRatio * 10 * CONTEXT_WEIGHT;
        } else {
          const contextRatio = usageA.contextual.withoutSelection / 
            Math.max(1, usageA.contextual.withSelection + usageA.contextual.withoutSelection);
          scoreA += contextRatio * 10 * CONTEXT_WEIGHT;
        }
      }
      
      if (usageB) {
        const daysSinceUsed = (now - usageB.lastUsed) / (1000 * 60 * 60 * 24);
        const decayedUsage = usageB.count * Math.pow(TIME_DECAY_FACTOR, daysSinceUsed);
        scoreB += decayedUsage * RECENCY_WEIGHT;
        
        // Time of day pattern matching
        const timeScore = usageB.timeOfDay[currentHour] / Math.max(1, usageB.count);
        scoreB += timeScore * 100 * TIME_OF_DAY_WEIGHT;
        
        // Context matching
        if (context?.selectedText) {
          const contextRatio = usageB.contextual.withSelection / 
            Math.max(1, usageB.contextual.withSelection + usageB.contextual.withoutSelection);
          scoreB += contextRatio * 10 * CONTEXT_WEIGHT;
        } else {
          const contextRatio = usageB.contextual.withoutSelection / 
            Math.max(1, usageB.contextual.withSelection + usageB.contextual.withoutSelection);
          scoreB += contextRatio * 10 * CONTEXT_WEIGHT;
        }
      }
      
      // Higher score comes first
      return scoreB - scoreA;
    });
  }, [usageData]);

  // Smart suggestions based on time and context
  const getSmartSuggestions = useCallback((context?: ContextInfo) => {
    const hour = new Date().getHours();
    
    // Morning suggestions (6-12): Focus on starting/organizing
    if (hour >= 6 && hour < 12) {
      return ['outline', 'continue', 'voice'];
    }
    
    // Afternoon suggestions (12-18): Productive writing
    if (hour >= 12 && hour < 18) {
      return ['expand', 'light-edit', 'rewrite'];
    }
    
    // Evening suggestions (18-22): Polish and review
    if (hour >= 18 && hour < 22) {
      return ['light-edit', 'condense', 'review'];
    }
    
    // Night/late suggestions: Quick fixes
    return ['light-edit', 'condense'];
  }, []);

  return {
    recordUsage,
    getRankedCommands,
    getSmartSuggestions,
    usageData
  };
}