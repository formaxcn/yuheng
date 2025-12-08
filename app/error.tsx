'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error using our pino logger instance
        logger.error(error, "Global Error Boundary caught an exception");
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4 text-center p-4">
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <p className="text-muted-foreground max-w-md">
                We apologize for the inconvenience. An unexpected error occurred.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => window.location.href = '/'}>
                    Go Home
                </Button>
                <Button variant="outline" onClick={() => reset()}>
                    Try again
                </Button>
            </div>
        </div>
    );
}
