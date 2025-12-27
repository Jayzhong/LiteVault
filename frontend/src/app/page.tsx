'use client';

import { getGreeting, microcopy } from '@/lib/microcopy';
import { InputBar } from '@/components/shared/InputBar';
import { PendingReviewSection } from '@/components/domain/home/PendingReviewSection';
import { useAppContext } from '@/lib/store/AppContext';

export default function HomePage() {
  const { addPendingItem } = useAppContext();

  const handleSave = (text: string) => {
    addPendingItem(text);
  };

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {getGreeting('Alex')}
        </h1>
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
        />
      </div>

      {/* Pending Review Section */}
      <PendingReviewSection />
    </div>
  );
}
