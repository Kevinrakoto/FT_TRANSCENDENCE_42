import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation - Tank Battle',
  description: 'Interactive API documentation for the Tank Battle public API. Explore endpoints, schemas, and test requests.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function ApiDocsPage() {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <div id="swagger-ui" style={{ minHeight: '100vh' }} />
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              if (typeof SwaggerUIBundle !== 'undefined') {
                SwaggerUIBundle({
                  url: '/api/docs',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                  ],
                  layout: 'StandaloneLayout',
                  defaultModelsExpandDepth: 1,
                  defaultModelExpandDepth: 1,
                  tryItOutEnabled: true
                });
              }
            });
          `,
        }}
      />
    </>
  )
}
