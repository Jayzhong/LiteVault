import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes: Home page, auth pages, and API health check
// Users can view Home without signing in
const isPublicRoute = createRouteMatcher([
    "/",
    "/auth/login(.*)",
    "/auth/signup(.*)",
    "/api/health(.*)",
]);

// Protected routes require authentication
// These will redirect to /auth/login if unauthenticated
const isProtectedRoute = createRouteMatcher([
    "/settings(.*)",
    "/library(.*)",
    "/search(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
    // Only protect specific routes, not all non-public routes
    // This allows Home (/) to be public while protecting /settings, /library, /search
    if (isProtectedRoute(request)) {
        try {
            await auth.protect({
                unauthenticatedUrl: new URL("/auth/login", request.url).toString(),
            });
        } catch {
            // If auth.protect() throws (e.g., no session), redirect to login
            const loginUrl = new URL("/auth/login", request.url);
            loginUrl.searchParams.set("redirect_url", request.url);
            return NextResponse.redirect(loginUrl);
        }
    }
});

export const config = {
    // Match all routes except static files and internal Next.js routes
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
