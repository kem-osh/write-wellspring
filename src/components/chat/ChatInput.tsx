import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, X, Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDevice } from '@/hooks/useDevice';
import { useHaptics } from '@/hooks/useHaptics';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionUse?: (suggestion: string) => void;
}

export function ChatInput({ 
  onSendMessage, 
  onVoiceInput, 
  isLoading = false,
  placeholder = "Ask about your documents...",
  suggestions = [],
  onSuggestionUse
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = useDevice();
  const { impactLight } = useHaptics();

  const handleSend = useCallback(() => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setIsExpanded(false);
      impactLight();
    }
  }, [message, isLoading, onSendMessage, impactLight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isMobile || e.shiftKey) {
        // On mobile or with Shift, allow new line
        return;
      } else {
        // Desktop: Enter sends, Shift+Enter for new line
        e.preventDefault();
        handleSend();
      }
    }
    
    if (e.key === 'Escape') {
      setIsExpanded(false);
      textareaRef.current?.blur();
    }
  }, [handleSend, isMobile]);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
    setShowSuggestions(suggestions.length > 0 && !message.trim());
  }, [suggestions.length, message]);

  const handleBlur = useCallback(() => {
    // Delay to allow for suggestion clicks
    setTimeout(() => {
      setIsExpanded(false);
      setShowSuggestions(false);
    }, 150);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    onSuggestionUse?.(suggestion);
    textareaRef.current?.focus();
    impactLight();
  }, [onSuggestionUse, impactLight]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, isMobile ? 100 : 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, isMobile]);

  // Show suggestions when empty and focused
  useEffect(() => {
    if (isExpanded && !message.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [message, isExpanded, suggestions.length]);

  return (
    <div className="relative">
      {/* Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div className="bg-card/95 backdrop-blur-sm border border-border/20 rounded-xl p-3 shadow-xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted/60"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-2 text-sm rounded-lg hover:bg-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6">
        <div className="chat-container">
          <div className={`chat-input-glass rounded-2xl transition-all duration-300 ${
            isExpanded ? 'p-4' : 'p-3'
          }`}>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  className={`resize-none bg-transparent border-0 focus-visible:ring-0 p-0 transition-all duration-200 ${
                    isMobile 
                      ? 'min-h-[48px] max-h-[100px] text-base' 
                      : 'min-h-[56px] max-h-[120px] text-base'
                  }`}
                  disabled={isLoading}
                  rows={1}
                />
              </div>
              
              <div className="flex gap-2">
                {onVoiceInput && (
                  <Button
                    onClick={onVoiceInput}
                    variant="ghost"
                    size="icon"
                    className={`rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 touch-target ${
                      isMobile ? 'h-12 w-12' : 'h-10 w-10'
                    }`}
                  >
                    <Mic className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                  </Button>
                )}
                
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || isLoading}
                  size="icon"
                  className={`rounded-full shadow-lg hover:shadow-xl transition-all duration-200 touch-target ${
                    isMobile ? 'h-12 w-12' : 'h-10 w-10'
                  }`}
                >
                  <Send className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                </Button>
              </div>
            </div>
            
            {/* Mobile-optimized help text */}
            {(isExpanded || !isMobile) && (
              <div className="mt-3 text-center">
                <span className="text-xs text-muted-foreground">
                  {isMobile 
                    ? "Tap send button • Use voice input" 
                    : "Press Enter to send • Shift+Enter for new line"
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}