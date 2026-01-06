'use client';

/**
 * AttachmentGrid component for displaying images in smart layouts.
 * 
 * Layout rules:
 * - 1 image: full width, max-height preserved aspect
 * - 2 images: side-by-side 50/50
 * - 3 images: 1 large left + 2 stacked right
 * - 4+ images: 2x2 grid with "+N" overlay on last
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { microcopy } from '@/lib/microcopy';
import type { AttachmentInfo } from '@/lib/types';

export interface AttachmentGridProps {
    /** Image attachments to display */
    attachments: AttachmentInfo[];
    /** Called when an image is clicked, with the index in the array */
    onImageClick?: (index: number) => void;
    /** Download URLs for each attachment (by id) */
    downloadUrls?: Record<string, string>;
    /** Callback to fetch download URL for an attachment */
    onRequestUrl?: (attachmentId: string) => Promise<string>;
    /** Custom class name */
    className?: string;
}

interface ImageTileProps {
    attachment: AttachmentInfo;
    url?: string;
    onRequestUrl?: (id: string) => Promise<string>;
    onClick?: () => void;
    className?: string;
    overlay?: React.ReactNode;
}

function ImageTile({
    attachment,
    url,
    onRequestUrl,
    onClick,
    className,
    overlay
}: ImageTileProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(url || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleLoad = async () => {
        if (imageUrl || isLoading) return;
        if (!onRequestUrl) return;

        setIsLoading(true);
        try {
            const fetchedUrl = await onRequestUrl(attachment.id);
            setImageUrl(fetchedUrl);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Trigger URL fetch on mount if no URL provided
    useState(() => {
        if (!imageUrl && onRequestUrl) {
            handleLoad();
        }
    });

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-lg bg-muted cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "transition-transform hover:scale-[1.02]",
                className
            )}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={attachment.displayName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    Failed to load
                </div>
            ) : (
                <div className="w-full h-full bg-muted" />
            )}
            {overlay}
        </button>
    );
}

export function AttachmentGrid({
    attachments,
    onImageClick,
    downloadUrls = {},
    onRequestUrl,
    className,
}: AttachmentGridProps) {
    const images = attachments.filter(a => a.kind === 'image');
    const count = images.length;

    if (count === 0) return null;

    const getUrl = (attachment: AttachmentInfo) => downloadUrls[attachment.id];

    // Single image layout
    if (count === 1) {
        return (
            <div className={cn("w-full", className)}>
                <ImageTile
                    attachment={images[0]}
                    url={getUrl(images[0])}
                    onRequestUrl={onRequestUrl}
                    onClick={() => onImageClick?.(0)}
                    className="w-full max-h-[300px] aspect-video"
                />
            </div>
        );
    }

    // Two images layout (50/50)
    if (count === 2) {
        return (
            <div className={cn("grid grid-cols-2 gap-2", className)}>
                {images.map((img, idx) => (
                    <ImageTile
                        key={img.id}
                        attachment={img}
                        url={getUrl(img)}
                        onRequestUrl={onRequestUrl}
                        onClick={() => onImageClick?.(idx)}
                        className="aspect-square"
                    />
                ))}
            </div>
        );
    }

    // Three images layout (1 large + 2 stacked)
    if (count === 3) {
        return (
            <div className={cn("grid grid-cols-2 gap-2", className)}>
                <ImageTile
                    attachment={images[0]}
                    url={getUrl(images[0])}
                    onRequestUrl={onRequestUrl}
                    onClick={() => onImageClick?.(0)}
                    className="row-span-2 aspect-[3/4]"
                />
                <ImageTile
                    attachment={images[1]}
                    url={getUrl(images[1])}
                    onRequestUrl={onRequestUrl}
                    onClick={() => onImageClick?.(1)}
                    className="aspect-square"
                />
                <ImageTile
                    attachment={images[2]}
                    url={getUrl(images[2])}
                    onRequestUrl={onRequestUrl}
                    onClick={() => onImageClick?.(2)}
                    className="aspect-square"
                />
            </div>
        );
    }

    // Four+ images layout (2x2 with +N overlay)
    const displayImages = images.slice(0, 4);
    const remainingCount = count - 4;

    return (
        <div className={cn("grid grid-cols-2 gap-2", className)}>
            {displayImages.map((img, idx) => (
                <ImageTile
                    key={img.id}
                    attachment={img}
                    url={getUrl(img)}
                    onRequestUrl={onRequestUrl}
                    onClick={() => onImageClick?.(idx)}
                    className="aspect-square"
                    overlay={
                        idx === 3 && remainingCount > 0 ? (
                            <div
                                className="absolute inset-0 bg-black/50 flex items-center justify-center"
                                aria-label={`${remainingCount} more images`}
                            >
                                <span className="text-white text-xl font-semibold">
                                    +{remainingCount}
                                </span>
                            </div>
                        ) : undefined
                    }
                />
            ))}
        </div>
    );
}
