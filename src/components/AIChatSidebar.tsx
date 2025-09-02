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
  FileText
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
}

export function AIChatSidebar({ isOpen, onClose, onDocumentSelect }: AIChatSidebarProps) {
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
    <div className="w-full h-full flex flex-col bg-sidebar">
      {/* Enhanced Header with better contrast */}
      <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-sidebar-border bg-sidebar shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-primary/10 border border-sidebar-primary/20">
            <Bot className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sidebar-foreground text-heading-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Chat with your documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearChat} 
            disabled={messages.length === 0}
            className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div className="flex-1 overflow-hidden bg-surface/30">
        <ScrollArea className="h-full">
          <div className="p-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="p-4 rounded-2xl bg-sidebar-primary/10 border border-sidebar-primary/20 mb-6">
                  <Bot className="w-12 h-12 text-sidebar-primary" />
                </div>
                <h4 className="text-heading-md mb-3 text-sidebar-foreground">Ask me about your documents</h4>
                <p className="text-body-md text-muted-foreground mb-8 max-w-sm leading-relaxed">
                  I can help you write, edit, find information in your documents, or answer questions about your content.
                </p>
                
                {/* Compact Centered Suggestion Cards */}
                <div className="flex flex-col gap-2 items-center">
                  <button
                    onClick={() => sendMessage("Summarize my recent blog posts")}
                    className="group px-3 py-2 text-xs bg-card hover:bg-sidebar-accent border border-border rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm">📝</span>
                      <span className="font-medium group-hover:text-sidebar-primary transition-colors">Summarize recent posts</span>
                    </div>
                  </button>
                  <button
                    onClick={() => sendMessage("Help me improve this draft")}
                    className="group px-3 py-2 text-xs bg-card hover:bg-sidebar-accent border border-border rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm">✨</span>
                      <span className="font-medium group-hover:text-sidebar-primary transition-colors">Improve my draft</span>
                    </div>
                  </button>
                  <button
                    onClick={() => sendMessage("What topics have I written about?")}
                    className="group px-3 py-2 text-xs bg-card hover:bg-sidebar-accent border border-border rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm">🔍</span>
                      <span className="font-medium group-hover:text-sidebar-primary transition-colors">Analyze my topics</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="animate-fade-in">
                    {/* Enhanced Message Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-1.5 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-sidebar-primary/10 border border-sidebar-primary/20'
                          : 'bg-muted/50 border border-border'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-sidebar-primary" />
                        ) : (
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-body-sm font-medium ${
                        message.role === 'user' ? 'text-sidebar-primary' : 'text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                    </div>
                    
                    {/* Enhanced Message Content */}
                    <div className={`ml-10 p-4 rounded-xl border transition-all duration-200 ${
                      message.role === 'user'
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary/20 shadow-sm'
                        : 'bg-card border-border shadow-sm hover:shadow-md'
                    }`}>
                      <div className="text-body-md leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Enhanced Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/20">
                          <span className="text-caption text-muted-foreground font-medium">Referenced documents:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {message.sources.map((source) => (
                              <button
                                key={source.id}
                                onClick={() => handleSourceClick(source.id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-muted/50 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground rounded-lg transition-all duration-200 border border-border hover:border-sidebar-primary/20 shadow-sm hover:shadow-md"
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
                ))}

                {/* Enhanced Typing indicator */}
                {isLoading && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-1.5 rounded-lg bg-muted/50 border border-border">
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-body-sm font-medium text-muted-foreground">Assistant</span>
                    </div>
                    <div className="ml-10 p-4 bg-card border border-border rounded-xl shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-sidebar-primary/60 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-sidebar-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 bg-sidebar-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
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

      {/* Enhanced Input Area */}
      <div className="flex-shrink-0 p-5 border-t border-sidebar-border bg-sidebar shadow-lg">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents, get writing help..."
              className="min-h-[56px] max-h-[120px] resize-none bg-card/50 border-border focus:bg-card focus:border-sidebar-primary/40 rounded-xl shadow-sm transition-all duration-200"
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={() => sendMessage()} 
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-[56px] w-[56px] flex-shrink-0 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-sidebar-primary hover:bg-sidebar-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="mt-3 text-center">
          <span className="text-caption text-muted-foreground">
            Press Enter to send • Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
