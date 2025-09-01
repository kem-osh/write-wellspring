import { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedCommand } from '@/types/commands'; // Import the UnifiedCommand type

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

// Updated Document interface for consistency
interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  category: string;
  status: string;
  word_count: number;
  updated_at: string;
  user_id?: string;
}

interface FullScreenAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect?: (doc: Document) => void;
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
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const sendMessage = async (messageText: string) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "Please log in to use the AI chat.",
        variant: "destructive",
      });
      return;
    }

    addMessage({ role: 'user', content: messageText });
    setIsLoading(true);

    try {
      // Create the required `command` object for the backend
      const chatCommand: Partial<UnifiedCommand> = {
        ai_model: 'gpt-5-mini-2025-08-07',
        system_prompt: 'You are a helpful assistant that analyzes documents. Use the provided context to give accurate responses about their writing.',
        max_tokens: 1500,
        temperature: 0.7,
      };

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: messageText, 
          userId,
          command: chatCommand // Add the command object to the payload
        }
      });

      if (error) throw error;

      // Correctly access `data.message` for the response content
      addMessage({
        role: 'assistant',
        content: data.message, 
        sources: data.sources || []
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Add an error message directly to the chat for better UX
      addMessage({
        role: 'assistant',
        content: "I'm sorry, but I encountered an error while processing your request. Please try again in a moment.",
      });
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceClick = async (sourceId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) throw error;

      // Pass the full document object to the handler
      if (data) {
        onDocumentSelect?.(data);
        onClose();
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: "Document Error",
        description: "Failed to open document.",
        variant: "destructive",
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="chat-overlay animate-slide-in-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
    >
      <div className="h-full flex flex-col" data-theme="dark">
        <ChatHeader 
          onClose={onClose}
          onClearChat={clearChat}
          messagesCount={messages.length}
        />
        
        <div className="flex-1 overflow-y-auto">
          <div className="chat-container py-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 w-fit mx-auto">
                    <svg className="w-12 h-12 text-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground">Ask questions about your documents and I'll help you find answers.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 text-left max-w-md mx-auto">
                    {[
                      { icon: "🎯", text: "What are the main themes in my documents?" },
                      { icon: "📚", text: "Find documents about mythology" },
                      { icon: "📝", text: "Summarize my recent writings" }
                    ].map((suggestion) => (
                      <Card
                        key={suggestion.text}
                        variant="elevated"
                        className="group cursor-pointer hover-scale transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => sendMessage(suggestion.text)}
                      >
                        <CardContent padding="sm">
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
                            <span className="text-body-sm font-medium group-hover:text-primary transition-colors">
                              {suggestion.text}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    {...message}
                    onSourceClick={handleSourceClick}
                  />
                ))}
                {isLoading && (
                  <ChatMessage
                    id="loading"
                    role="assistant"
                    content="Thinking..."
                    timestamp={new Date()}
                    isStreaming={true}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        
        <div className="pb-safe">
          <ChatInput
            onSendMessage={sendMessage}
            onVoiceInput={onVoiceInput}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}