import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, BookOpen, Users, Briefcase, Heart, Zap } from "lucide-react";

interface CategorySelectionProps {
  onCategorySelect: (category: string) => void;
}

const categories = [
  {
    id: 'creative',
    name: 'Creative Writing',
    description: 'Fiction, poetry, stories',
    icon: <Lightbulb className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-200 dark:border-purple-800'
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Reports, proposals, emails',
    icon: <Briefcase className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-200 dark:border-blue-800'
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Research, essays, analysis',
    icon: <BookOpen className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-200 dark:border-green-800'
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Journal, notes, thoughts',
    icon: <Heart className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-200 dark:border-red-800'
  },
  {
    id: 'collaborative',
    name: 'Collaborative',
    description: 'Shared documents, feedback',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-200 dark:border-orange-800'
  },
  {
    id: 'general',
    name: 'Quick Start',
    description: 'Start writing immediately',
    icon: <Zap className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-200 dark:border-indigo-800'
  }
];

export function CategorySelection({ onCategorySelect }: CategorySelectionProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              LogosScribe
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-2">
            Your AI-powered writing studio
          </p>
          <p className="text-sm text-muted-foreground">
            Choose a category to get started
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card 
              key={category.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${category.color}`}
              onClick={() => onCategorySelect(category.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/50">
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => onCategorySelect('general')}
            className="bg-background/50 border-dashed"
          >
            <FileText className="h-4 w-4 mr-2" />
            Or start with a blank document
          </Button>
        </div>
      </div>
    </div>
  );
}