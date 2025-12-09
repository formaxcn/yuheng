import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'WgerLens API',
                version: '1.0',
            },
        },
        apis: ['./app/api/**/route.ts', './app/api/**/page.tsx'], // Explicitly target route files
    });
    return spec;
};
