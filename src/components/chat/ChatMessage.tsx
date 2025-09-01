import { Bot, User, FileText } from 'lucide-react';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
  timestamp: Date;
  onSourceClick?: (sourceId: string) => void;
  isStreaming?: boolean;
}

export function ChatMessage({ 
  role, 
  content, 
  sources, 
  onSourceClick, 
  isStreaming = false 
}: ChatMessageProps) {
  return (
    <div className="flex gap-4 mb-6 animate-message-enter">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground'
      }`}>
        {role === 'user' ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      
      <div className="flex-1 space-y-3">
        <div className={`message-bubble ${
          role === 'user' ? 'message-bubble-user' : 'message-bubble-ai'
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-current ml-1 animate-caret-blink" />
            )}
          </div>
        </div>
        
        {sources && sources.length > 0 && (
          <div className="ml-2 space-y-2">
            <span className="text-xs text-muted-foreground font-medium">Referenced documents:</span>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => onSourceClick?.(source.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-muted/50 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200 border border-border hover:border-primary/20"
                >
                  <FileText className="w-3 h-3" />
                  <span className="font-medium">{source.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}