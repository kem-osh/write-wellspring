import { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  created_at: string;
}

interface FullScreenAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect?: (documentId: string) => void;
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
  const [suggestions, setSuggestions] = useState<string[]>([
    "What are the main themes in my documents?",
    "Find documents about mythology",
    "Summarize my recent writings",
    "Compare my latest drafts",
    "Extract key insights from selected documents"
  ]);
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
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: messageText, userId }
      });

      if (error) throw error;

      addMessage({
        role: 'assistant',
        content: data.response,
        sources: data.sources || []
      });
    } catch (error) {
      console.error('Error sending message:', error);
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

      onDocumentSelect?.(sourceId);
      onClose();
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: "Document Error",
        description: "Failed to open document.",
        variant: "destructive",
      });
    }
  };

  const handleVoiceInput = async () => {
    try {
      // Integrate with existing VoiceRecorder functionality
      // This would trigger the voice recording modal or inline recording
      if (onVoiceInput) {
        onVoiceInput();
      } else {
        toast({
          title: "Voice Input",
          description: "Voice input is not available in this context.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Voice input error:', error);
      toast({
        title: "Voice Input Error",
        description: "Failed to start voice recording.",
        variant: "destructive",
      });
    }
  };

  const handleSuggestionUse = (suggestion: string) => {
    // When user clicks a suggestion, we can either send it immediately
    // or just populate the input. For now, let's send it immediately.
    sendMessage(suggestion);
  };

  const updateSuggestionsBasedOnContext = () => {
    // Update suggestions based on recent messages or document context
    const contextualSuggestions = [
      "What are the main themes in my documents?",
      "Find documents about mythology", 
      "Summarize my recent writings",
      "Compare my latest drafts",
      "Extract key insights from selected documents"
    ];
    
    // If there are existing messages, provide more contextual suggestions
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        contextualSuggestions.push(
          "Tell me more about that",
          "Can you elaborate?",
          "Show me related documents"
        );
      }
    }
    
    setSuggestions(contextualSuggestions.slice(0, 5)); // Limit to 5 suggestions
  };

  const clearChat = () => {
    setMessages([]);
    updateSuggestionsBasedOnContext();
  };

  // Update suggestions when messages change
  useEffect(() => {
    updateSuggestionsBasedOnContext();
  }, [messages.length]);

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
            onVoiceInput={handleVoiceInput}
            isLoading={isLoading}
            suggestions={suggestions}
            onSuggestionUse={handleSuggestionUse}
            placeholder="Ask about your documents or use voice input..."
          />
        </div>
      </div>
    </div>
  );
}