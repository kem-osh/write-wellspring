import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

type RecorderState = 'ready' | 'recording' | 'processing' | 'error' | 'unsupported';

export function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('ready');
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimTranscriptRef = useRef('');

  // Check for browser support
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setState('unsupported');
    }
  }, []);

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setState('unsupported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setState('recording');
      setTranscript('');
      interimTranscriptRef.current = '';
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      interimTranscriptRef.current = interimTranscript;
      setTranscript(finalTranscript + (interimTranscript ? ` ${interimTranscript}` : ''));
    };

    recognition.onend = async () => {
      console.log('Speech recognition ended');
      const finalText = transcript || interimTranscriptRef.current;
      
      if (finalText.trim()) {
        setState('processing');
        
        // Generate AI title if this could be a new document
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-generate-title', {
            body: { content: finalText }
          });

          if (titleData?.title) {
            console.log('Generated title:', titleData.title);
          }
        } catch (error) {
          console.error('Failed to generate title:', error);
        }

        onTranscription(finalText);
        toast({
          title: "Transcription complete",
          description: `Captured ${finalText.split(' ').length} words`,
        });
      }
      
      setState('ready');
      setTranscript('');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setState('error');
      
      let errorMessage = 'Speech recognition failed';
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking louder.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone.';
          break;
      }

      toast({
        title: "Voice recording error",
        description: errorMessage,
        variant: "destructive",
      });

      setTimeout(() => setState('ready'), 2000);
    };

    return recognition;
  };

  const startRecording = () => {
    if (state !== 'ready' || disabled) return;

    const recognition = initializeRecognition();
    if (!recognition) return;

    triggerHapticFeedback();
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current && state === 'recording') {
      triggerHapticFeedback();
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const handleClick = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'ready') {
      startRecording();
    }
  };

  if (state === 'unsupported') {
    return (
      <Button variant="outline" size="sm" disabled>
        <MicOff className="h-3 w-3 mr-1" />
        Not Supported
      </Button>
    );
  }

  const getButtonVariant = () => {
    switch (state) {
      case 'recording':
        return 'destructive';
      case 'processing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getButtonClass = () => {
    const baseClass = 'transition-all duration-200';
    if (state === 'recording') {
      return `${baseClass} animate-pulse bg-destructive hover:bg-destructive/90 border-destructive`;
    }
    if (state === 'ready') {
      return `${baseClass} bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary`;
    }
    return baseClass;
  };

  // Haptic feedback for mobile devices
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant={getButtonVariant()}
        size="sm"
        onClick={handleClick}
        disabled={disabled || state === 'processing' || state === 'error'}
        className={getButtonClass()}
      >
        {state === 'processing' ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : state === 'recording' ? (
          <Mic className="h-3 w-3 mr-1" />
        ) : (
          <Mic className="h-3 w-3 mr-1" />
        )}
        {state === 'processing' ? 'Processing...' : state === 'recording' ? 'Recording' : 'Voice'}
      </Button>
      
      {transcript && state === 'recording' && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-md p-3 bg-card border rounded-lg shadow-lg z-10 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            <p className="text-xs text-muted-foreground font-medium">Live transcription:</p>
          </div>
          <p className="text-sm">{transcript}</p>
        </div>
      )}
    </div>
  );
}