import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  RotateCcw,
  FileText,
  Expand
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
  timestamp: Date;
}

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect: (doc: Document) => void;
  expanded?: boolean;
  onExpandToggle?: () => void;
}

export function AIChatSidebar({ isOpen, onClose, onDocumentSelect, expanded, onExpandToggle }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearChat = () => {
    setMessages([]);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || !userId || isLoading) return;

    setInputMessage('');
    
    // Add user message
    addMessage({ role: 'user', content: messageToSend });
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: messageToSend,
          userId
        }
      });

      if (error) throw error;

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: data.message,
        sources: data.sources
      });

    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      });
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSourceClick = async (sourceId: string) => {
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) throw error;

      if (doc) {
        onDocumentSelect(doc);
        onClose(); // Close sidebar after opening document
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "Error",
        description: "Failed to open document.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearChat} disabled={messages.length === 0}>
            <RotateCcw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          {onExpandToggle && (
            <Button variant="ghost" size="icon" onClick={onExpandToggle} title="Expand to Full Screen">
              <Expand className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        <ScrollArea className="h-full">
          <div className="p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">Ask me about your documents</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  I can help you write, edit, find information in your documents, or answer questions about your content.
                </p>
                
                {/* Suggestion Chips */}
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  <button
                    onClick={() => sendMessage("Summarize my recent blog posts")}
                    className="px-4 py-3 text-sm bg-background hover:bg-muted border border-border rounded-lg transition-colors text-left"
                  >
                    📝 Summarize recent posts
                  </button>
                  <button
                    onClick={() => sendMessage("Help me improve this draft")}
                    className="px-4 py-3 text-sm bg-background hover:bg-muted border border-border rounded-lg transition-colors text-left"
                  >
                    ✨ Improve my draft
                  </button>
                  <button
                    onClick={() => sendMessage("What topics have I written about?")}
                    className="px-4 py-3 text-sm bg-background hover:bg-muted border border-border rounded-lg transition-colors text-left"
                  >
                    🔍 Analyze my topics
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="animate-fade-in">
                    {/* Message Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'user' ? (
                        <>
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">You</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Assistant</span>
                        </>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className={`ml-6 p-3 rounded-lg border ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground border-primary/20'
                        : 'bg-background border-border'
                    }`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <span className="text-xs text-muted-foreground">Referenced:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.sources.map((source) => (
                              <button
                                key={source.id}
                                onClick={() => handleSourceClick(source.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                {source.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Assistant</span>
                    </div>
                    <div className="ml-6 p-3 bg-background border border-border rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
        <div className="flex gap-2 items-end">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents, get writing help..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-muted/50 border-border focus:bg-background"
            disabled={isLoading}
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}