'use client';

import { useState } from 'react';
import { microcopy } from '@/lib/microcopy';
import { Button } from '@/components/ui/button';
import { Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';

interface AnswerCardProps {
    answer: string;
}

export function AnswerCard({ answer }: AnswerCardProps) {
    const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

    return (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-foreground">
                    {microcopy.search.section.answer}
                </h2>
            </div>

            {/* Answer Content */}
            <div className="prose prose-sm max-w-none text-muted-foreground">
                {answer.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-3 last:mb-0">
                        {paragraph}
                    </p>
                ))}
            </div>

            {/* Feedback Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground mr-2">Was this helpful?</span>
                <Button
                    variant={feedback === 'helpful' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('helpful')}
                    className={feedback === 'helpful' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                    <ThumbsUp className="h-4 w-4 mr-1.5" />
                    {microcopy.search.feedback.helpful}
                </Button>
                <Button
                    variant={feedback === 'not_helpful' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedback('not_helpful')}
                    className={feedback === 'not_helpful' ? 'bg-muted-foreground' : ''}
                >
                    <ThumbsDown className="h-4 w-4 mr-1.5" />
                    {microcopy.search.feedback.notHelpful}
                </Button>
            </div>
        </div>
    );
}
