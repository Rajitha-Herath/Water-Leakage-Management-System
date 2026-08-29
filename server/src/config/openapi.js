export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'NWSDB Water Leakage Management API',
    version: '1.0.0',
    description: 'REST API used by the React OIC dashboard, Flutter field-officer app, and Twilio WhatsApp webhook.'
  },
  servers: [{ url: 'http://localhost:5000/api', description: 'Local development' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } }
      },
      StatusUpdate: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['Reached', 'In_Progress', 'Resolved'] }, notes: { type: 'string' } }
      }
    }
  },
  paths: {
    '/health': { get: { summary: 'API health check', responses: { 200: { description: 'Healthy' } } } },
    '/auth/login': {
      post: {
        summary: 'Staff login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
        responses: { 200: { description: 'JWT and user profile' }, 401: { description: 'Invalid login' } }
      }
    },
    '/auth/me': { get: { summary: 'Current user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile' } } } },
    '/complaints': {
      get: {
        summary: 'List accessible complaints',
        security: [{ bearerAuth: [] }],
        parameters: ['status', 'source', 'area', 'officer', 'from', 'to', 'q', 'page', 'limit'].map((name) => ({ name, in: 'query', schema: { type: 'string' } })),
        responses: { 200: { description: 'Paginated complaints' } }
      },
      post: { summary: 'Create manual complaint (OIC)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created' } } }
    },
    '/complaints/{id}': {
      get: { summary: 'Complaint details', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Complaint with photos/history' } } }
    },
    '/complaints/{id}/assign': {
      patch: { summary: 'Assign officer (OIC)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Assigned' } } }
    },
    '/complaints/{id}/status': {
      patch: { summary: 'Apply the next valid status', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusUpdate' } } } }, responses: { 200: { description: 'Updated' }, 409: { description: 'Invalid transition' } } }
    },
    '/users': {
      get: { summary: 'List system users (OIC)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'System users and active workloads' } } },
      post: { summary: 'Create an officer account (OIC)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Account created' } } }
    },
    '/users/{id}': {
      patch: { summary: 'Update an account (OIC)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Account updated' } } },
      delete: { summary: 'Delete an account (OIC)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Account deleted' }, 400: { description: 'Self-deletion or final OIC is protected' }, 409: { description: 'Officer still has active complaints' } } }
    },
    '/reports/summary': { get: { summary: 'Analytics summary (OIC)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'KPI and chart data' } } } },
    '/webhooks/twilio/whatsapp': { post: { summary: 'Twilio WhatsApp webhook', responses: { 201: { description: 'TwiML confirmation' } } } }
  }
};
