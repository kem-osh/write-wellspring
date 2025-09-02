import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  onTranscription?: (text: string) => void;
  onDocumentCreated?: (documentId: string) => void;
  disabled?: boolean;
}

type RecorderState = 'ready' | 'recording' | 'processing' | 'error' | 'unsupported';

export function VoiceRecorder({ onTranscription, onDocumentCreated, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('ready');
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
        
        try {
          // Process the audio with our edge function
          await processVoiceRecording(finalText);
        } catch (error) {
          console.error('Voice processing error:', error);
          // Fallback to old behavior if processing fails
          if (onTranscription) {
            onTranscription(finalText);
          }
        }
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

  const startRecording = async () => {
    if (state !== 'ready' || disabled) return;

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use voice recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start both speech recognition and audio recording
      const recognition = initializeRecognition();
      if (!recognition) return;

      // Request microphone access and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      triggerHapticFeedback();
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      setState('error');
      setTimeout(() => setState('ready'), 2000);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && state === 'recording') {
      triggerHapticFeedback();
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleClick = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'ready') {
      startRecording();
    }
  };

  // Process voice recording with Whisper
  const processVoiceRecording = async (fallbackText: string) => {
    if (!user || !mediaRecorderRef.current) {
      if (onTranscription) onTranscription(fallbackText);
      return;
    }

    try {
      // Wait for audio recording to finish
      const audioBlob = await new Promise<Blob>((resolve) => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            resolve(blob);
          };
        } else {
          // Already stopped
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          resolve(blob);
        }
      });

      // Convert to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
        };
        reader.readAsDataURL(audioBlob);
      });

      // Send to voice transcription function
      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: {
          audio: base64Audio,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data?.document) {
        toast({
          title: "Voice note saved",
          description: `Created "${data.document.title}" with ${data.wordCount} words`,
        });
        
        if (onDocumentCreated) {
          onDocumentCreated(data.document.id);
        }
      }

    } catch (error) {
      console.error('Voice processing failed:', error);
      toast({
        title: "Voice processing failed",
        description: "Using fallback transcription instead",
        variant: "destructive",
      });
      
      // Fallback to speech recognition text
      if (onTranscription) {
        onTranscription(fallbackText);
      }
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