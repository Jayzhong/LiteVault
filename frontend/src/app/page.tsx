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
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        {isLoading ? (
          <Skeleton className="h-9 w-64 mx-auto" />
        ) : (
          <h1 className="text-3xl font-semibold text-foreground">
            {getGreeting(displayName)}
          </h1>
        )}
        <p className="text-lg text-muted-foreground">
          {microcopy.home.subtitle}
        </p>
      </div>

      {/* Capture Section */}
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Row 1: Textarea + # Tag Button */}
        <div className="flex gap-2 items-start">
          <Textarea
            ref={textareaRef}
            value={hasMounted ? text : ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={microcopy.home.capture.placeholder}
            disabled={isSaving}
            rows={4}
            className="flex-1 resize-none"
          />

          {/* Tag Picker Button */}
          {isSignedIn ? (
            <TagPicker
              selectedTags={selectedTagNames}
              availableTags={availableTagNames}
              onChange={setSelectedTagNames}
              allowCreate={true}
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 mt-0"
                  title={microcopy.home.capture.tagHint}
                >
                  <Hash className="h-4 w-4" />
                </Button>
              }
            />
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              title={microcopy.home.capture.tagHint}
              onClick={handleTagButtonClick}
            >
              <Hash className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Selected Tags Display (from TagPicker) */}
        {selectedTagNames.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Tags: {selectedTagNames.join(', ')}
          </div>
        )}

        {/* Row 2: AI Toggle (left) + Save Button (right) */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* AI Toggle */}
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${aiSuggestionsEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <Switch
              id="ai-toggle"
              checked={aiSuggestionsEnabled}
              onCheckedChange={setAiSuggestionsEnabled}
            />
            <Label
              htmlFor="ai-toggle"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              {microcopy.home.capture.toggle.label}
            </Label>
            <span className="text-xs text-muted-foreground/70 hidden sm:inline">
              {aiSuggestionsEnabled
                ? microcopy.home.capture.toggle.onHint
                : microcopy.home.capture.toggle.offHint}
            </span>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isButtonDisabled}
            className={cn(
              'px-8',
              isButtonDisabled
                ? 'bg-muted text-muted-foreground'
                : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {isSaving ? 'Saving...' : microcopy.home.capture.action}
          </Button>
        </div>
      </div>

      {/* Pending Review Section - only show when signed in */}
      {isSignedIn && <PendingReviewSection />}
    </div>
  );
}
