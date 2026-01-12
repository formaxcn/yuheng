import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Currently just a pass-through. 
    // We can add logic here if we need to enforce default cookies on first visit, 
    // but for now we handle defaults in the app logic.
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all pathnames except for
        // - … if they start with `/api`, `/_next` or `/_vercel`
        // - … the ones containing a dot (e.g. `favicon.ico`)
        '/((?!api|_next|_vercel|.*\\..*).*)',
    ],
};
