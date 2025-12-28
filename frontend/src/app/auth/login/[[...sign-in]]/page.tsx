'use client';

import { SignIn } from '@clerk/nextjs';
import { microcopy } from '@/lib/microcopy';
import Link from 'next/link';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 p-8">
                {/* Logo */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
                            <span className="text-lg font-bold text-white">L</span>
                        </div>
                        <span className="text-xl font-semibold text-foreground">
                            {microcopy.app.name}
                        </span>
                    </div>
                </div>

                {/* Clerk SignIn Component */}
                <div className="flex justify-center">
                    <SignIn
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
                        path="/auth/login"
                        signUpUrl="/auth/signup"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Footer link to signup */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        <Link href="/auth/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            {microcopy.auth.signupLink}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
