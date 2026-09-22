export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Tech.CG API</h1>
          <p className="text-xl text-gray-300">RESTful API for managing stories, comments, and community content</p>
          <p className="text-sm text-gray-400 mt-4">API Version: v1 | Base URL: <code className="bg-gray-700 px-2 py-1 rounded">/api/v1</code></p>
        </div>

        {/* Authentication */}
        <section className="mb-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Authentication</h2>
          <p className="text-gray-300 mb-4">
            Authentication will be implemented using OAuth2. Currently, endpoints are open.
            All API responses include a timestamp and success indicator.
          </p>
          <div className="bg-gray-900 p-4 rounded text-sm">
            <pre className="text-green-400">{`// Coming Soon: OAuth2 Bearer Token
Authorization: Bearer YOUR_TOKEN`}</pre>
          </div>
        </section>

        {/* Response Format */}
        <section className="mb-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Response Format</h2>
          <p className="text-gray-300 mb-4">All API responses follow a consistent JSON structure:</p>
          <div className="bg-gray-900 p-4 rounded text-sm overflow-auto">
            <pre className="text-green-400">{`{
  "success": true,
  "data": { /* Response data */ },
  "timestamp": "2026-09-21T23:00:00Z"
}

// Error response:
{
  "success": false,
  "error": "Not found",
  "details": { /* Optional error details */ },
  "timestamp": "2026-09-21T23:00:00Z"
}`}</pre>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Endpoints</h2>

          {/* Stories */}
          <Endpoint
            method="GET"
            path="/stories"
            title="List Stories"
            description="Get paginated list of all stories"
            params={[
              { name: "page", type: "number", desc: "Page number (default: 1)" },
              { name: "perPage", type: "number", desc: "Items per page (default: 30, max: 100)" },
            ]}
            example={`GET /api/v1/stories?page=1&perPage=30

{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "African Tech Startup Launches AI",
        "url": "https://techcrunch.com/...",
        "author": {
          "id": 5,
          "username": "alice",
          "karma": 150
        },
        "points": 45,
        "commentCount": 12,
        "flagCount": 0,
        "createdAt": "2026-09-21T10:00:00Z",
        "updatedAt": "2026-09-21T10:00:00Z"
      }
    ],
    "total": 500,
    "page": 1,
    "perPage": 30,
    "hasNext": true,
    "hasPrev": false
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/stories"
            title="Create Story"
            description="Submit a new story (requires authentication)"
            body="{ title: string, url?: string, text?: string }"
            example={`POST /api/v1/stories

{
  "title": "New AI Breakthrough in Africa",
  "url": "https://example.com/article"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": 501,
    "title": "New AI Breakthrough in Africa",
    "url": "https://example.com/article",
    "author": {
      "id": 5,
      "username": "alice",
      "karma": 150
    },
    "points": 1,
    "commentCount": 0,
    "flagCount": 0,
    "createdAt": "2026-09-21T23:00:00Z",
    "updatedAt": "2026-09-21T23:00:00Z"
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/stories/:id"
            title="Get Story"
            description="Get a specific story by ID"
            example={`GET /api/v1/stories/1

{
  "success": true,
  "data": { /* Story object */ }
}`}
          />

          <Endpoint
            method="PATCH"
            path="/stories/:id"
            title="Update Story"
            description="Update a story (only title, url, text; requires ownership)"
            body="{ title?: string, url?: string, text?: string }"
            example={`PATCH /api/v1/stories/1

{
  "title": "Updated Title"
}

Response: 200 OK`}
          />

          <Endpoint
            method="DELETE"
            path="/stories/:id"
            title="Delete Story"
            description="Delete a story (mark as deleted; requires admin)"
            example={`DELETE /api/v1/stories/1

{
  "success": true,
  "data": { "deleted": true }
}`}
          />

          {/* Comments */}
          <Endpoint
            method="GET"
            path="/comments"
            title="List Comments"
            description="Get comments on a story"
            params={[
              { name: "itemId", type: "number", desc: "Parent item ID (required)" },
              { name: "page", type: "number", desc: "Page number (default: 1)" },
              { name: "perPage", type: "number", desc: "Items per page (default: 30)" },
            ]}
            example={`GET /api/v1/comments?itemId=1&page=1`}
          />

          <Endpoint
            method="POST"
            path="/comments"
            title="Create Comment"
            description="Post a comment on a story"
            body="{ text: string, parentId: number }"
            example={`POST /api/v1/comments

{
  "text": "Great article! Really insightful discussion about AI in Africa.",
  "parentId": 1
}

Response: 201 Created`}
          />

          {/* Users */}
          <Endpoint
            method="GET"
            path="/users/:username"
            title="Get User"
            description="Get user profile and stats"
            example={`GET /api/v1/users/alice

{
  "success": true,
  "data": {
    "id": 5,
    "username": "alice",
    "about": "Tech enthusiast from Lagos",
    "karma": 150,
    "itemCount": 42,
    "commentCount": 128,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}`}
          />

          {/* Votes */}
          <Endpoint
            method="POST"
            path="/votes"
            title="Vote/Unvote"
            description="Upvote or unvote a story/comment"
            body="{ itemId: number }"
            example={`POST /api/v1/votes

{
  "itemId": 1
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": 42,
    "itemId": 1,
    "userId": 5,
    "voted": true,
    "createdAt": "2026-09-21T23:00:00Z"
  }
}

// Posting again unvotes
POST /api/v1/votes
{ "itemId": 1 }

Response: 200 OK
{
  "success": true,
  "data": { "voted": false }
}`}
          />
        </section>

        {/* Error Codes */}
        <section className="mb-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Error Codes</h2>
          <div className="space-y-3">
            <ErrorCode code="400" desc="Bad Request - Invalid parameters or validation failed" />
            <ErrorCode code="404" desc="Not Found - Resource doesn't exist" />
            <ErrorCode code="401" desc="Unauthorized - Authentication required" />
            <ErrorCode code="403" desc="Forbidden - Access denied" />
            <ErrorCode code="409" desc="Conflict - Resource already exists" />
            <ErrorCode code="429" desc="Rate Limited - Too many requests" />
            <ErrorCode code="500" desc="Internal Server Error" />
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Rate Limits</h2>
          <p className="text-gray-300 mb-4">Rate limiting is not yet enforced, but will be added in production.</p>
          <div className="bg-gray-900 p-4 rounded text-sm">
            <p className="text-green-400 mb-2">Planned limits:</p>
            <ul className="text-gray-300 space-y-1 ml-4">
              <li>• 100 requests per minute (unauthenticated)</li>
              <li>• 1000 requests per minute (authenticated)</li>
            </ul>
          </div>
        </section>

        {/* SDK/Libraries */}
        <section className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Client Libraries</h2>
          <p className="text-gray-300 mb-4">Coming soon</p>
        </section>
      </div>
    </div>
  );
}

function Endpoint({
  method,
  path,
  title,
  description,
  params,
  body,
  example,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  params?: Array<{ name: string; type: string; desc: string }>;
  body?: string;
  example: string;
}) {
  const methodColor = {
    GET: "text-blue-400",
    POST: "text-green-400",
    PATCH: "text-yellow-400",
    DELETE: "text-red-400",
  }[method];

  return (
    <div className="mb-8 bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <span className={`font-bold text-lg ${methodColor}`}>{method}</span>
        <code className="bg-gray-900 px-3 py-1 rounded text-sm">{path}</code>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 mb-4">{description}</p>

      {params && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-300 mb-2">Parameters:</p>
          <div className="space-y-2 ml-4">
            {params.map((p) => (
              <div key={p.name} className="text-sm text-gray-400">
                <span className="text-gray-300">{p.name}</span>
                <span className="text-gray-500"> ({p.type})</span>
                <span className="ml-2">- {p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {body && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-300 mb-2">Request Body:</p>
          <code className="bg-gray-900 px-3 py-1 rounded text-sm text-gray-300 ml-4">{body}</code>
        </div>
      )}

      <div className="bg-gray-900 p-4 rounded text-sm overflow-auto">
        <pre className="text-green-400 text-xs">{example}</pre>
      </div>
    </div>
  );
}

function ErrorCode({ code, desc }: { code: string; desc: string }) {
  return (
    <div className="flex gap-4 bg-gray-900 p-3 rounded">
      <span className="font-semibold text-red-400 min-w-16">{code}</span>
      <span className="text-gray-300">{desc}</span>
    </div>
  );
}
