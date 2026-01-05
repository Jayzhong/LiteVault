'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGreeting, microcopy } from '@/lib/microcopy';
import { PendingReviewSection } from '@/components/domain/home/PendingReviewSection';
import { TagPicker } from '@/components/shared/TagPicker';
import { AttachButton } from '@/components/shared/AttachButton';
import { AttachmentStagingArea } from '@/components/domain/home/AttachmentStagingArea';
import { useAppContext } from '@/lib/store/AppContext';
import { apiClient } from '@/lib/api/client';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { useUpload } from '@/lib/hooks/useUpload';
import { useDropzone } from '@/lib/hooks/useDropzone';
import { useClipboardPaste } from '@/lib/hooks/useClipboardPaste';
import { StagedFile, createStagedFile, revokeStagedFile } from '@/lib/types/stagedFile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, Hash, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// LocalStorage key for draft text
const DRAFT_KEY = 'litevault_home_draft';

export default function HomePage() {
  const { addPendingItem, aiSuggestionsEnabled, setAiSuggestionsEnabled, error, clearError, tags } = useAppContext();
  const { profile, isLoading, isSignedIn } = useAccountProfile();
  const { uploadFile, clearUploads } = useUpload();
  const router = useRouter();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const captureContainerRef = useRef<HTMLDivElement>(null);

  // Load draft from localStorage AFTER mount to avoid hydration mismatch
  const [text, setText] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Staged files for optimistic UI with upload tracking
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // Selected tags for direct save (as tag names for TagPicker compatibility)
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  // Handler for adding files to staging area
  const handleFilesAccepted = useCallback((files: File[]) => {
    const newStagedFiles = files.map(createStagedFile);
    setStagedFiles(prev => [...prev, ...newStagedFiles]);
  }, []);

  // Handler for removing a staged file
  const handleRemoveStagedFile = useCallback((id: string) => {
    setStagedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        revokeStagedFile(fileToRemove);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Handler for retrying a failed upload
  const handleRetryStagedFile = useCallback((id: string) => {
    // Will be connected to upload logic below
    setStagedFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, status: 'uploading' as const, error: undefined, progress: 0 } : f
      )
    );
  }, []);

  // Update staged file status
  const updateStagedFile = useCallback((id: string, update: Partial<StagedFile>) => {
    setStagedFiles(prev =>
      prev.map(f => f.id === id ? { ...f, ...update } : f)
    );
  }, []);

  // Dropzone setup
  const { isDragActive, getRootProps } = useDropzone({
    onFilesAccepted: handleFilesAccepted,
    disabled: isSaving,
  });

  // Clipboard paste setup
  const { handlePaste } = useClipboardPaste({
    onFilePasted: (file) => handleFilesAccepted([file]),
    disabled: isSaving,
  });

  // Calculate if any file is still uploading
  const isUploading = stagedFiles.some(f => f.status === 'uploading');
  const hasFailedUploads = stagedFiles.some(f => f.status === 'failed');

  useEffect(() => {
    setHasMounted(true);
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY) || '';
      setText(savedDraft);
    } catch {
      // Silently fail if localStorage is not available
    }
  }, []);

  // Cleanup Blob URLs on unmount
  useEffect(() => {
    return () => {
      stagedFiles.forEach(revokeStagedFile);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSave = async () => {
    const trimmedText = text.trim();
    if (!trimmedText && stagedFiles.length === 0) return;

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

      // Find which tags are new (in selectedTagNames but not in existing tags)
      const existingTagIds: string[] = [];
      const newTagNames: string[] = [];

      for (const name of selectedTagNames) {
        const existingTag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existingTag) {
          existingTagIds.push(existingTag.id);
        } else {
          newTagNames.push(name);
        }
      }

      // Create new tags first and collect their IDs
      const newTagIds: string[] = [];
      for (const name of newTagNames) {
        try {
          const newTag = await apiClient.createTag(name);
          newTagIds.push(newTag.id);
        } catch (err) {
          console.error(`Failed to create tag "${name}":`, err);
        }
      }

      // Combine existing and new tag IDs
      const tagIds = [...existingTagIds, ...newTagIds];

      // Create item with all tag IDs
      const item = await addPendingItem(trimmedText || 'Uploaded files', aiSuggestionsEnabled, tagIds);

      // If we have staged files, upload them and attach to the created item
      if (stagedFiles.length > 0 && item?.id) {
        // Upload all staged files
        for (const stagedFile of stagedFiles) {
          if (stagedFile.status === 'success') continue; // Already uploaded

          updateStagedFile(stagedFile.id, { status: 'uploading', progress: 10 });

          try {
            const result = await uploadFile(stagedFile.file, item.id);
            if (result) {
              updateStagedFile(stagedFile.id, {
                status: 'success',
                progress: 100,
                attachmentId: result.attachment?.id,
              });
            } else {
              updateStagedFile(stagedFile.id, {
                status: 'failed',
                error: microcopy.upload.error.failed,
              });
            }
          } catch (err) {
            updateStagedFile(stagedFile.id, {
              status: 'failed',
              error: err instanceof Error ? err.message : microcopy.upload.error.failed,
            });
          }
        }
      }

      // Clear after successful save (even if some uploads failed)
      try {
        localStorage.removeItem(DRAFT_KEY);
        setText('');
        setSelectedTagNames([]);
        // Clear only successful uploads from staging
        setStagedFiles(prev => {
          const failed = prev.filter(f => f.status === 'failed');
          prev.filter(f => f.status !== 'failed').forEach(revokeStagedFile);
          return failed;
        });
        clearUploads();
      } catch {
        // Silently fail
      }

      // Invalidate library cache so new item shows up immediately
      queryClient.invalidateQueries({ queryKey: ['library'] });

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

  const isButtonDisabled = (!text.trim() && stagedFiles.length === 0) || isSaving || isUploading;

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

      {/* Capture Section with Dropzone */}
      <div className="max-w-2xl mx-auto">
        <div
          ref={captureContainerRef}
          {...getRootProps()}
          onPaste={handlePaste}
          className={cn(
            "relative rounded-3xl border bg-card shadow-sm ring-1 ring-black/5 transition-all",
            "hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 p-6 space-y-4",
            isDragActive && "border-primary border-dashed ring-2 ring-primary ring-offset-2"
          )}
        >
          {/* Dropzone Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 bg-primary/5 rounded-3xl flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload className="h-8 w-8" />
                <span className="font-medium">{microcopy.upload.dropzone.hint}</span>
              </div>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={hasMounted ? text : ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={microcopy.home.capture.placeholder}
            disabled={isSaving || isUploading}
            rows={3}
            className="w-full resize-none border-0 bg-transparent p-0 text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 min-h-[120px]"
          />

          {/* Staged Attachments Preview */}
          {stagedFiles.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <AttachmentStagingArea
                stagedFiles={stagedFiles}
                onRemove={handleRemoveStagedFile}
                onRetry={handleRetryStagedFile}
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-3">
              {/* Attach Button */}
              {isSignedIn && (
                <AttachButton
                  onFilesSelected={handleFilesAccepted}
                  disabled={isSaving || isUploading}
                />
              )}

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

            {/* Save Button with Uploading Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
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
                      {isSaving || isUploading ? 'Saving...' : microcopy.home.capture.action}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isUploading && (
                  <TooltipContent>
                    <p>{microcopy.upload.save.disabledUploading}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
