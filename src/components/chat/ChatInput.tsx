import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  onVoiceInput, 
  isLoading = false,
  placeholder = "Ask about your documents..."
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-6">
      <div className="chat-container">
        <div className="chat-input-glass rounded-2xl p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="min-h-[56px] max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 text-base p-0"
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
                  className="h-12 w-12 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <Mic className="w-5 h-5" />
                </Button>
              )}
              
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <span className="text-xs text-muted-foreground">
              Press Enter to send • Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}