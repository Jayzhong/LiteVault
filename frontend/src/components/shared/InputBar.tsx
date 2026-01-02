'use client';

import { useState, useEffect } from 'react';
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
    endAdornment?: React.ReactNode;
    onChange?: (text: string) => void;
    value?: string;
}

export function InputBar({
    mode,
    placeholder,
    buttonLabel,
    onSubmit,
    defaultValue = '',
    disabled = false,
    endAdornment,
    onChange,
    value,
}: InputBarProps) {
    // Internal state for uncontrolled usage, or sync with controlled value
    const [internalText, setInternalText] = useState(defaultValue);

    const text = value !== undefined ? value : internalText;

    const handleTextChange = (newText: string) => {
        setInternalText(newText);
        onChange?.(newText);
    };

    // Sync text with defaultValue when it changes (only initially or reset)
    useEffect(() => {
        if (defaultValue && !text && value === undefined) {
            setInternalText(defaultValue);
        }
    }, [defaultValue, text, value]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSubmit(text.trim());
            if (mode === 'capture') {
                setInternalText('');
                onChange?.('');
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
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Input
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={cn("w-full", endAdornment && "pr-20")}
                    />
                    {endAdornment && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                            {endAdornment}
                        </div>
                    )}
                </div>
                <Button
                    type="submit"
                    disabled={isButtonDisabled}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 w-full sm:w-auto shadow-sm"
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
                onChange={(e) => handleTextChange(e.target.value)}
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
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                    )}
                >
                    {buttonLabel}
                </Button>
            </div>
        </form>
    );
}
