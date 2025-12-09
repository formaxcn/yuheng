import { getApiDocs } from '@/lib/swagger';
import SwaggerClient from '@/components/swagger-client';

export const dynamic = 'force-dynamic';

export default async function ApiDocsPage() {
    const spec = await getApiDocs();
    return (
        <div className="bg-white dark:bg-gray-100 min-h-screen">
            <SwaggerClient spec={spec} />
        </div>
    );
}
