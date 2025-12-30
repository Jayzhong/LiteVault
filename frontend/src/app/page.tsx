'use client';

import { useState, useEffect, useRef } from 'react';
import { getGreeting, microcopy } from '@/lib/microcopy';
import { PendingReviewSection } from '@/components/domain/home/PendingReviewSection';
import { TagPicker } from '@/components/shared/TagPicker';
import { useAppContext } from '@/lib/store/AppContext';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// LocalStorage key for draft text
const DRAFT_KEY = 'litevault_home_draft';

export default function HomePage() {
  const { addPendingItem, aiSuggestionsEnabled, setAiSuggestionsEnabled, error, clearError, tags } = useAppContext();
  const { profile, isLoading, isSignedIn } = useAccountProfile();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft from localStorage AFTER mount to avoid hydration mismatch
  const [text, setText] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selected tags for direct save (as tag names for TagPicker compatibility)
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  useEffect(() => {
    setHasMounted(true);
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY) || '';
      setText(savedDraft);
    } catch {
      // Silently fail if localStorage is not available
    }
  }, []);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSave = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // If signed out, save draft and redirect to login
    if (!isSignedIn) {
      try {
        localStorage.setItem(DRAFT_KEY, trimmedText);
      } catch {
        // Silently fail if localStorage is not available
      }
      router.push('/auth/login?redirect_url=/');
      return;
    }

    // Signed in: proceed with save
    try {
      setIsSaving(true);

      // Convert tag names to IDs for API
      const tagIds = selectedTagNames
        .map(name => tags.find(t => t.name === name)?.id)
        .filter((id): id is string => Boolean(id));

      await addPendingItem(trimmedText, aiSuggestionsEnabled, tagIds);

      // Clear after successful save
      try {
        localStorage.removeItem(DRAFT_KEY);
        setText('');
        setSelectedTagNames([]);
      } catch {
        // Silently fail
      }

      // Show appropriate toast based on mode
      if (aiSuggestionsEnabled) {
        toast.success(microcopy.toast.savedGenerating);
      } else {
        toast.success(microcopy.toast.savedToLibrary);
      }
    } catch {
      // Error is handled by AppContext and shown via toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  // Handle # button click - auth gating
  const handleTagButtonClick = () => {
    if (!isSignedIn) {
      router.push('/auth/login?redirect_url=/');
    }
    // If signed in, TagPicker popover opens via its internal state
  };

  // Get displayName with fallback
  const displayName = profile?.displayName || 'Member';

  // Available tags as names for TagPicker
  const availableTagNames = tags.map(t => t.name);

  const isButtonDisabled = !text.trim() || isSaving;

  return (
    <div className="space-y-12 py-10">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        {isLoading ? (
          <Skeleton className="h-12 w-96 mx-auto" />
        ) : (
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {getGreeting(displayName)}
          </h1>
        )}
        <p className="text-lg text-muted-foreground font-light">
          {microcopy.home.subtitle}
        </p>
      </div>

      {/* Capture Section */}
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-3xl border border-border bg-card shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 p-6 space-y-4">

          <Textarea
            ref={textareaRef}
            value={hasMounted ? text : ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={microcopy.home.capture.placeholder}
            disabled={isSaving}
            rows={3}
            className="w-full resize-none border-0 bg-transparent p-0 text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 min-h-[120px]"
          />

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-3">
              {/* Tag Picker */}
              {isSignedIn ? (
                <TagPicker
                  selectedTags={selectedTagNames}
                  availableTags={availableTagNames}
                  onChange={setSelectedTagNames}
                  allowCreate={true}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-4 border-dashed text-muted-foreground hover:text-foreground"
                  title={microcopy.home.capture.tagHint}
                  onClick={handleTagButtonClick}
                >
                  <Hash className="h-3.5 w-3.5 mr-1.5" /> Add Tag
                </Button>
              )}

              {/* AI Toggle with Tooltip */}
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setAiSuggestionsEnabled(!aiSuggestionsEnabled)}
                        className={cn(
                          "p-2 rounded-full border transition-all",
                          aiSuggestionsEnabled
                            ? "bg-accent border-accent text-accent-foreground"
                            : "bg-transparent border-transparent text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{microcopy.home.capture.toggle.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isButtonDisabled}
              className={cn(
                'rounded-full px-6 h-9 transition-all font-medium text-sm',
                isButtonDisabled
                  ? 'bg-muted text-muted-foreground hover:bg-muted opacity-50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'
              )}
            >
              {isSaving ? 'Saving...' : microcopy.home.capture.action}
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Review Section */}
      {isSignedIn && (
        <div className="pt-8 text-center space-y-6">
          <div className="max-w-2xl mx-auto text-left">
            <PendingReviewSection />
          </div>
        </div>
      )}
    </div>
  );
}
