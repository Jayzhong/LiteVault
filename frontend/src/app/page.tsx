'use client';

import { getGreeting, microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { PendingReviewSection } from '@/components/domain/home/PendingReviewSection';
import { useAppContext } from '@/lib/store/AppContext';
import { useAccountProfile } from '@/lib/hooks/useAccountProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

// LocalStorage key for draft text
const DRAFT_KEY = 'litevault_home_draft';

export default function HomePage() {
  const { addPendingItem } = useAppContext();
  const { profile, isLoading, isSignedIn } = useAccountProfile();
  const router = useRouter();

  const handleSave = (text: string) => {
    // If signed out, save draft and redirect to login
    if (!isSignedIn) {
      // Persist draft to localStorage
      try {
        localStorage.setItem(DRAFT_KEY, text);
      } catch {
        // Silently fail if localStorage is not available
      }
      // Redirect to login with returnBackUrl
      router.push('/auth/login?redirect_url=/');
      return;
    }

    // Signed in: proceed with normal behavior
    addPendingItem(text);

    // Clear any saved draft after successful save
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Silently fail
    }
  };

  // Get displayName with fallback
  const displayName = profile?.displayName || 'Member';

  // Get saved draft for defaultValue (only after component mounts)
  const getSavedDraft = (): string => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(DRAFT_KEY) || '';
    } catch {
      return '';
    }
  };

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

      {/* Capture Input */}
      <div className="max-w-2xl mx-auto">
        <InputBar
          mode="capture"
          placeholder={microcopy.home.capture.placeholder}
          buttonLabel={microcopy.home.capture.action}
          onSubmit={handleSave}
          defaultValue={getSavedDraft()}
        />
      </div>

      {/* Pending Review Section - only show when signed in */}
      {isSignedIn && <PendingReviewSection />}
    </div>
  );
}
