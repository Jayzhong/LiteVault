import { cn } from "@/lib/utils";
import { microcopy } from "@/lib/microcopy";
import Image from "next/image";

interface AppLogoProps {
    className?: string;
    iconClassName?: string;
    textClassName?: string;
    size?: "sm" | "md" | "lg" | "xl";
    iconOnly?: boolean;
}

export function AppLogo({
    className,
    iconClassName,
    textClassName,
    size = "md",
    iconOnly = false
}: AppLogoProps) {

    const sizeClasses = {
        sm: { container: "h-8 w-8 rounded-lg", icon: "h-5 w-5", text: "text-lg" },
        md: { container: "h-10 w-10 rounded-xl", icon: "h-6 w-6", text: "text-xl" },
        lg: { container: "h-12 w-12 rounded-xl", icon: "h-7 w-7", text: "text-2xl" },
        xl: { container: "h-16 w-16 rounded-2xl", icon: "h-10 w-10", text: "text-4xl" },
    };

    const s = sizeClasses[size];

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div className={cn("relative flex items-center justify-center overflow-hidden shadow-sm shrink-0", s.container, iconClassName)}>
                <Image
                    src="/brand/logo/logo-mark-v3.png"
                    alt="Logo"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 40px, 64px"
                    priority
                />
            </div>
            {!iconOnly && (
                <span className={cn("font-bold tracking-tight text-foreground", s.text, textClassName)}>
                    {microcopy.app.name}
                </span>
            )}
        </div>
    );
}
