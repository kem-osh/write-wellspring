import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';

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
        
        onTranscription(finalText);
        
        const wordCount = finalText.trim().split(/\s+/).filter(word => word.length > 0).length;
        toast({
          title: "Voice transcription complete",
          description: `Captured ${wordCount} words successfully`,
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

  // Haptic feedback for mobile devices
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  if (state === 'unsupported') {
    return (
      <Button className="h-11 px-3 rounded-lg bg-muted/50 cursor-not-allowed flex items-center gap-2" disabled>
        <MicOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm hidden sm:inline text-muted-foreground">Not Supported</span>
      </Button>
    );
  }

  const getButtonText = () => {
    switch (state) {
      case 'recording': return 'Recording...';
      case 'processing': return 'Transcribing...';
      case 'error': return 'Error';
      default: return 'Voice';
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={disabled || state === 'processing' || state === 'error'}
        className={`
          relative transition-all duration-200 h-11 px-3 rounded-lg flex items-center justify-center gap-2 min-w-fit font-medium
          ${state === 'recording' 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/25 text-white' 
            : state === 'processing'
            ? 'bg-muted text-muted-foreground cursor-wait'
            : 'bg-voice-button hover:bg-voice-button/90 text-voice-button-foreground'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {state === 'processing' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'error' ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span className="text-sm hidden sm:inline">{getButtonText()}</span>
      </Button>
      
      {transcript && state === 'recording' && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 max-w-md p-3 bg-card border rounded-lg shadow-lg z-20 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-muted-foreground font-medium">Live transcription:</p>
          </div>
          <p className="text-sm leading-relaxed">{transcript}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            {transcript.trim().split(/\s+/).filter(word => word.length > 0).length} words
          </div>
        </div>
      )}
    </div>
  );
}