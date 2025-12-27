'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InputBarProps {
    mode: 'capture' | 'search';
    placeholder: string;
    buttonLabel: string;
    onSubmit: (text: string) => void;
    defaultValue?: string;
    disabled?: boolean;
}

export function InputBar({
    mode,
    placeholder,
    buttonLabel,
    onSubmit,
    defaultValue = '',
    disabled = false,
}: InputBarProps) {
    const [text, setText] = useState(defaultValue);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSubmit(text.trim());
            if (mode === 'capture') {
                setText('');
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
        }
    };

    const isButtonDisabled = !text.trim() || disabled;

    if (mode === 'search') {
        return (
            <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="flex-1"
                />
                <Button
                    type="submit"
                    disabled={isButtonDisabled}
                    className="bg-emerald-600 hover:bg-emerald-700 px-6"
                >
                    {buttonLabel}
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={4}
                className="resize-none"
            />
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={cn(
                        'px-8',
                        isButtonDisabled
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                >
                    {buttonLabel}
                </Button>
            </div>
        </form>
    );
}
