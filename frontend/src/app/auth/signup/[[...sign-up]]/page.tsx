'use client';

import { SignUp } from '@clerk/nextjs';
import { microcopy } from '@/lib/microcopy';
import Link from 'next/link';
import { AppLogo } from '@/components/shared/AppLogo';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 p-8">
                {/* Logo */}
                <div className="flex justify-center">
                    <AppLogo size="md" />
                </div>

                {/* Clerk SignUp Component */}
                <div className="flex justify-center">
                    <SignUp
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "shadow-none border-0 bg-transparent w-full",
                                headerTitle: "text-2xl font-semibold text-foreground",
                                headerSubtitle: "text-muted-foreground",
                                socialButtonsBlockButton: "border border-border hover:bg-muted",
                                formFieldInput: "border-border focus:ring-emerald-500",
                                formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700",
                                footerActionLink: "text-emerald-600 hover:text-emerald-700",
                            },
                        }}
                        routing="path"
                        path="/auth/signup"
                        signInUrl="/auth/login"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Footer links */}
                <div className="text-center space-y-4">
                    <p className="text-xs text-muted-foreground">
                        By signing up, you agree to our{' '}
                        <Link href="#" className="underline hover:text-foreground">
                            {microcopy.auth.terms}
                        </Link>{' '}
                        and{' '}
                        <Link href="#" className="underline hover:text-foreground">
                            {microcopy.auth.privacy}
                        </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            {microcopy.auth.loginLink}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
