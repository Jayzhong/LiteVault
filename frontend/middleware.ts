import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
]);

export default clerkMiddleware(async (auth, request) => {
    // Only protect specific routes, not all non-public routes
    // This allows Home (/) to be public while protecting /settings, /library, /search
    if (isProtectedRoute(request)) {
        await auth.protect({
            unauthenticatedUrl: "/auth/login",
        });
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
