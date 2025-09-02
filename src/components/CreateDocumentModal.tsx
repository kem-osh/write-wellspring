import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { FileText, Mic, Upload, File, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string | null;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  icon: string;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Document',
    description: 'Start with a clean slate',
    content: '',
    tags: [],
    icon: 'FileText'
  },
  {
    id: 'mythology-analysis',
    name: 'Mythology Analysis',
    description: 'Template for analyzing mythological texts using Amythicism',
    content: `# Mythology Analysis: [Title]

## Source & Context
- **Origin**: 
- **Cultural Background**: 
- **Historical Period**: 

## Initial Observations
[Record your first impressions and notable elements]

## Amythicism Analysis

### Environmental Markers
- **Geological/Geographical Elements**: 
- **Climate/Weather Patterns**: 
- **Natural Disasters/Phenomena**: 

### Nervous System Patterns
- **Stress Responses**: 
- **Trauma Indicators**: 
- **Healing/Recovery Elements**: 

### Evolutionary Wisdom
- **Survival Strategies**: 
- **Adaptation Mechanisms**: 
- **Social/Tribal Dynamics**: 

## Modern Parallels
[Connect ancient wisdom to contemporary understanding]

## Practical Applications
[How can this insight be applied today?]

## Further Research
[Questions and areas for deeper exploration]
`,
    tags: ['mythology', 'analysis', 'amythicism'],
    icon: 'Sparkles'
  },
  {
    id: 'voice-chapter',
    name: 'Voice Chapter Template',
    description: 'Structure for voice-recorded chapters',
    content: `# Chapter [Number]: [Title]

*Voice recorded on [Date]*

## Key Themes
- 
- 
- 

## Main Content
[Voice transcription will be inserted here]

## Cross-References
[Links to related documents and concepts]

## Notes for Revision
[Areas to expand or clarify]
`,
    tags: ['voice', 'chapter', 'structure'],
    icon: 'Mic'
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    description: 'Structured format for research documentation',
    content: `# Research Notes: [Topic]

## Research Question
[What are you investigating?]

## Sources
1. 
2. 
3. 

## Key Findings
### Finding 1
**Evidence**: 
**Significance**: 

### Finding 2
**Evidence**: 
**Significance**: 

## Connections
[How does this relate to other research?]

## Action Items
- [ ] 
- [ ] 
- [ ] 

## Bibliography
[Detailed source citations]
`,
    tags: ['research', 'notes', 'academic'],
    icon: 'File'
  }
];

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  open,
  onOpenChange,
  defaultFolderId
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [folderId, setFolderId] = useState<string | undefined>(defaultFolderId || undefined);
  const [creationMode, setCreationMode] = useState<'template' | 'voice' | 'upload'>('template');
  const [isRecording, setIsRecording] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders for selection
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: {
      title: string;
      content: string;
      folder_id?: string;
      tags?: string[];
      is_voice_generated?: boolean;
    }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('documents')
        .insert([{
          ...documentData,
          user_id: user.id,
          status: 'draft',
          word_count: documentData.content.split(' ').filter(word => word.length > 0).length
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Document created",
        description: "Your new document has been created successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error creating document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedTemplate('blank');
    setFolderId(defaultFolderId || undefined);
    setCreationMode('template');
    setIsRecording(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setContent(template.content);
      if (!title && template.name !== 'Blank Document') {
        setTitle(template.name);
      }
    }
  };

  const handleCreateDocument = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your document.",
        variant: "destructive",
      });
      return;
    }

    const template = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplate);
    
    createDocumentMutation.mutate({
      title: title.trim(),
      content: content,
      folder_id: folderId,
      tags: template?.tags || [],
      is_voice_generated: creationMode === 'voice'
    });
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    // Voice recording logic will be implemented separately
    toast({
      title: "Voice recording",
      description: "Voice recording feature coming soon!",
    });
  };

  const handleFileUpload = () => {
    // File upload logic
    toast({
      title: "File upload",
      description: "Bulk upload feature is available in the main library!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
        </DialogHeader>

        <Tabs value={creationMode} onValueChange={(value: any) => setCreationMode(value)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="template" className="h-full flex flex-col mt-4">
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Template Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Choose a Template</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DOCUMENT_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer transition-all",
                          "hover:border-primary/50 hover:bg-primary/5",
                          selectedTemplate === template.id && "border-primary bg-primary/10"
                        )}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {template.icon === 'FileText' && <FileText className="w-5 h-5" />}
                            {template.icon === 'Sparkles' && <Sparkles className="w-5 h-5" />}
                            {template.icon === 'Mic' && <Mic className="w-5 h-5" />}
                            {template.icon === 'File' && <File className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            {template.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {template.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="folder">Folder (Optional)</Label>
                    <Select value={folderId} onValueChange={setFolderId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root Folder</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate !== 'blank' && (
                    <div>
                      <Label htmlFor="content">Content Preview</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="mt-1 h-32 font-mono text-sm"
                        placeholder="Content will appear here..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="voice" className="h-full flex flex-col mt-4">
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className={cn(
                    "w-12 h-12",
                    isRecording ? "text-red-500 animate-pulse" : "text-primary"
                  )} />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Voice Recording</h3>
                  <p className="text-muted-foreground">
                    {isRecording 
                      ? "Recording... Click stop when finished"
                      : "Click start to begin recording your voice note"
                    }
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={startVoiceRecording}
                  disabled={isRecording}
                  className={cn(
                    "min-w-32",
                    isRecording && "bg-red-500 hover:bg-red-600"
                  )}
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>

                <div className="w-full max-w-md space-y-4">
                  <div>
                    <Label htmlFor="voice-title">Title</Label>
                    <Input
                      id="voice-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Voice note title..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="voice-folder">Folder (Optional)</Label>
                    <Select value={folderId} onValueChange={setFolderId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root Folder</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="h-full flex flex-col mt-4">
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
                  <p className="text-muted-foreground">
                    For bulk document upload, use the main upload feature in the library
                  </p>
                </div>

                <Button size="lg" onClick={handleFileUpload}>
                  Open Bulk Uploader
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDocument} 
            disabled={!title.trim() || createDocumentMutation.isPending}
          >
            {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};