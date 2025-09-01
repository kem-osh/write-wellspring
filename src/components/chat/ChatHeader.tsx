import { X, RotateCcw, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  onClose: () => void;
  onClearChat: () => void;
  messagesCount: number;
}

export function ChatHeader({ onClose, onClearChat, messagesCount }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Assistant</h2>
          <p className="text-sm text-muted-foreground">Chat with your documents</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          disabled={messagesCount === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}