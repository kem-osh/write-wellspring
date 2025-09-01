import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

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

interface FullScreenAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect: (doc: Document) => void;
  onVoiceInput?: () => void;
}

export function FullScreenAIChat({ 
  isOpen, 
  onClose, 
  onDocumentSelect,
  onVoiceInput 
}: FullScreenAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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

  const sendMessage = async (messageText: string) => {
    if (!messageText || !userId || isLoading) return;

    // Add user message
    addMessage({ role: 'user', content: messageText });
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: messageText,
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
        onClose();
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
    <div className="chat-overlay animate-fade-in">
      <div className="chat-container">
        <ChatHeader 
          onClose={onClose}
          onClearChat={clearChat}
          messagesCount={messages.length}
        />
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pb-32">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
                  <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                    <Bot className="w-16 h-16 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-foreground">
                    Ask me anything about your documents
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md text-lg leading-relaxed">
                    I can help you write, edit, find information, or answer questions about your content.
                  </p>
                  
                  <div className="grid gap-3 w-full max-w-md">
                    <button
                      onClick={() => sendMessage("Summarize my recent blog posts")}
                      className="p-4 text-left bg-card hover:bg-muted border border-border rounded-xl transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📝</span>
                        <span className="font-medium">Summarize recent posts</span>
                      </div>
                    </button>
                    <button
                      onClick={() => sendMessage("Help me improve this draft")}
                      className="p-4 text-left bg-card hover:bg-muted border border-border rounded-xl transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✨</span>
                        <span className="font-medium">Improve my draft</span>
                      </div>
                    </button>
                    <button
                      onClick={() => sendMessage("What topics have I written about?")}
                      className="p-4 text-left bg-card hover:bg-muted border border-border rounded-xl transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🔍</span>
                        <span className="font-medium">Analyze my topics</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      {...message}
                      onSourceClick={handleSourceClick}
                    />
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 mb-6 animate-fade-in">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="message-bubble message-bubble-ai">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
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
        
        <ChatInput
          onSendMessage={sendMessage}
          onVoiceInput={onVoiceInput}
          isLoading={isLoading}
          placeholder="Ask about your documents..."
        />
      </div>
    </div>
  );
}