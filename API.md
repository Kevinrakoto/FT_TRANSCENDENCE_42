# API Documentation

## Overview

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Auth**: NextAuth.js v4 (session/cookie) + API Key (`X-API-Key` header)
- **Database**: PostgreSQL via Prisma ORM
- **Real-time**: Socket.io
- **OpenAPI Spec**: `GET /api/docs`

---

## Authentication

**Session (cookie-based)**
- Mechanism: NextAuth with email + password login
- Used by: All `/api/*` routes except `/api/signup` and `/api/public/*`

**API Key**
- Mechanism: `X-API-Key: pk_<uuid>` header
- Used by: `/api/public/*` routes

### Session User Shape

```json
{
  "id": 1,
  "username": "TankMaster",
  "email": "user@example.com",
  "avatar": "/uploads/avatars/user_1.png",
  "tankColor": "#00ff00"
}
```

### API Key Auth

- Generated via `POST /api/me/api-keys`
- Header: `X-API-Key: pk_<uuid>`
- Rate limited: **100 req/min** per key/IP
- Returns `401` if missing/invalid/expired, `429` if rate limited

---

## Error Responses

All endpoints may return the following status codes:

- `400` -- Bad request / validation error
- `401` -- Not authenticated (missing or invalid session/API key)
- `403` -- Forbidden (insufficient permissions)
- `404` -- Resource not found
- `409` -- Conflict (duplicate resource)
- `429` -- Rate limit exceeded (public API only)
- `500` -- Internal server error

---

## Endpoints

### Auth

#### `POST /api/signup`

Register a new user account.

**Auth**: None

**Request Body**:

```json
{
  "username": "TankMaster",
  "email": "user@example.com",
  "password": "securepassword",
  "tankColor": "#00ff00"
}
```

- `username` (string, required)
- `email` (string, required)
- `password` (string, required)
- `tankColor` (string, optional, default `#00ff00`)

**Response `201`**:

```json
{
  "message": "Account created successfully",
  "user": { "id": 1, "username": "TankMaster", "email": "user@example.com", "tankColor": "#00ff00" },
  "redirect": "/signin"
}
```

---

#### `GET|POST /api/auth/[...nextauth]`

NextAuth handler for login and session management. Uses `CredentialsProvider` with email + password. Sets user online on sign-in, offline on sign-out.

---

### Me (Session-protected)

#### `GET /api/me`

Get the authenticated user's full profile.

**Response `200`**:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "TankMaster",
    "avatar": "/uploads/avatars/user_1.png",
    "tankLevel": 5,
    "tankColor": "#00ff00",
    "xp": 1200,
    "wins": 10,
    "gamesPlayed": 25,
    "isOnline": true,
    "lastSeen": "2024-01-01T00:00:00Z"
  }
}
```

---

#### `PUT /api/me`

Update the authenticated user's tank color.

**Request Body**:

```json
{ "tankColor": "#ff0000" }
```

**Response `200`**: `{ "user": { ...updatedFields } }`

**Side effects**: Emits `user-profile-updated` Socket.io event.

---

#### `GET /api/me/online`

Get authenticated user's online status.

**Response `200`**:

```json
{ "id": 1, "isOnline": true, "lastSeen": "2024-01-01T00:00:00Z" }
```

---

#### `PUT /api/me/online`

Set online/offline status.

**Request Body**:

```json
{ "isOnline": false }
```

---

#### `GET /api/me/notifications`

Get paginated notifications.

**Query Params**:

- `limit` (int, default 20, max 100) -- Number of results
- `offset` (int, default 0) -- Pagination offset
- `isRead` (boolean, optional) -- Filter by read status

**Response `200`**:

```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "type": "FRIEND_REQUEST",
      "title": "New friend request",
      "message": "TankPro sent you a friend request",
      "isRead": false,
      "data": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "unreadCount": 5,
  "pagination": { "total": 50, "limit": 20, "offset": 0, "hasMore": true }
}
```

---

#### `PUT /api/me/notifications`

Mark notifications as read.

**Request Body** (one of):

```json
{ "markAllRead": true }
```

```json
{ "notificationIds": [1, 2, 3] }
```

**Response `200`**: `{ "message": "Notifications updated", "unreadCount": 3 }`

---

#### `DELETE /api/me/notifications`

Delete notifications.

**Request Body** (one of):

```json
{ "clearAll": true }
```

```json
{ "notificationId": 5 }
```

**Response `200`**: `{ "message": "Notification(s) deleted", "unreadCount": 2 }`

---

#### `GET /api/me/api-keys`

List all API keys for the authenticated user.

**Response `200`**:

```json
{
  "data": [
    {
      "id": 1,
      "name": "My CLI Key",
      "isActive": true,
      "expiresAt": null,
      "lastUsedAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/me/api-keys`

Create a new API key.

**Request Body**:

```json
{ "name": "My CLI Key", "expiresInDays": 30 }
```

- `name` (string, required) -- Human-readable key name
- `expiresInDays` (int, optional) -- Expiration in days (no expiry if omitted)

**Response `200`**:

```json
{
  "message": "API key created successfully",
  "data": {
    "id": 1,
    "name": "My CLI Key",
    "key": "pk_abc123...",
    "isActive": true,
    "expiresAt": "2024-02-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### `DELETE /api/me/api-keys?id=<int>`

Revoke and delete an API key.

**Query Params**: `id` (required)

**Response `200`**: `{ "message": "API key deleted successfully" }`

---

### Profiles (Session-protected)

#### `PUT /api/profiles/update`

Update authenticated user's username.

**Request Body**:

```json
{ "username": "NewUsername" }
```

**Response `200`**:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "NewUsername",
    "avatar": "/uploads/avatars/user_1.png",
    "tankLevel": 5,
    "gamesAsPlayer": []
  }
}
```

**Side effects**: Emits `user-profile-updated` Socket.io event.

---

#### `POST /api/profiles/avatar`

Upload a new avatar image.

**Request Body**: `multipart/form-data`

- `avatar` (file, required) -- JPEG/PNG/GIF/WebP, max 5 MB

**Response `200`**:

```json
{
  "message": "Avatar uploaded successfully",
  "user": {
    "id": 1,
    "username": "TankMaster",
    "email": "user@example.com",
    "avatar": "/uploads/avatars/user_1_1234.png",
    "tankColor": "#00ff00"
  }
}
```

**Side effects**: Writes file to `public/uploads/avatars/`, emits `user-profile-updated` Socket.io event.

---

### Friends (Session-protected)

#### `GET /api/friends/list`

List all accepted friends.

**Response `200`**:

```json
[
  {
    "id": 2,
    "username": "TankPro",
    "avatar": "/uploads/avatars/user_2.png",
    "tankColor": "#ff0000",
    "isOnline": true,
    "lastSeen": "2024-01-01T00:00:00Z",
    "conversationId": 5
  }
]
```

---

#### `GET /api/friends/pending`

Get pending friend requests received by the authenticated user.

**Response `200`**:

```json
[
  {
    "id": 1,
    "status": "PENDING",
    "sender": {
      "id": 2,
      "username": "TankPro",
      "avatar": "/uploads/avatars/user_2.png",
      "tankColor": "#ff0000"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### `GET /api/friends/search?q=<string>`

Search users by username.

**Query Params**: `q` (required, min 2 chars, case-insensitive partial match)

**Response `200`** (max 5 results):

```json
[
  {
    "id": 2,
    "username": "TankPro",
    "tankColor": "#ff0000",
    "avatar": "/uploads/avatars/user_2.png",
    "isOnline": true,
    "friendshipStatus": "none"
  }
]
```

`friendshipStatus` values: `none`, `pending`, `friends`

---

#### `POST /api/friends/request`

Send a friend request.

**Request Body**:

```json
{ "username": "TankPro" }
```

**Response `200`**: Friendship object with `status: "PENDING"`

**Side effects**: Creates notification, emits `friend-notification` Socket.io event.

---

#### `POST /api/friends/accept`

Accept a pending friend request. Creates a private conversation.

**Request Body**:

```json
{ "friendshipId": 1 }
```

**Response `200`**:

```json
{
  "friendship": { "id": 1, "status": "ACCEPTED" },
  "conversation": { "id": 5 }
}
```

---

#### `POST /api/friends/deny`

Decline a pending friend request.

**Request Body**:

```json
{ "friendshipId": 1 }
```

**Response `200`**: `{ "success": true }`

---

#### `DELETE /api/friends/delete?id=<int>`

Remove a friendship and delete the associated conversation + all messages.

**Query Params**: `id` (friend's user ID, required)

**Response `200`**: `{ "success": true }`

**Side effects**: Deletes friendship, conversation, messages, messageReads, conversationParticipants in a transaction. Creates notification, emits Socket.io event.

---

### Chat (Session-protected)

#### `GET /api/conversations/[id]/messages`

Get messages from a conversation (ascending order, max 200).

**Path Params**: `id` -- conversation ID

**Auth**: Session + must be a conversation participant.

**Response `200`**:

```json
[
  {
    "id": 1,
    "content": "Hello!",
    "conversationId": 5,
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "user": { "id": 1, "username": "TankMaster", "tankColor": "#00ff00" },
    "readBy": [{ "userId": 2 }]
  }
]
```

---

### Game (Session-protected)

#### `POST /api/game/results`

Submit game results after a multiplayer match.

**Request Body**:

```json
{
  "leaderboard": [
    { "userId": 1, "username": "TankMaster", "playerNumber": 1, "score": 10 }
  ],
  "gameMode": 2
}
```

- `leaderboard` (array, required) -- Players with `userId`, `username`, `playerNumber`, `score`
- `gameMode` (int, required) -- Game mode identifier

**XP Rewards**: Winner +100 XP, loser +10 XP.

**Response `200`**: `{ "success": true }`

---

### Leaderboard (Public)

#### `GET /api/leaderboard`

Get top players sorted by wins, games played, or XP.

**Auth**: None

**Query Params**:

- `sortBy` (string, default `wins`) -- Options: `wins`, `gamesPlayed`, `xp`
- `limit` (int, default 10, max 100)

**Response `200`**:

```json
{
  "leaderboard": [
    {
      "id": 1,
      "username": "TankMaster",
      "tankLevel": 12,
      "xp": 5400,
      "wins": 42,
      "gamesPlayed": 100
    }
  ]
}
```

---

### Docs (Public)

#### `GET /api/docs`

Returns the OpenAPI 3.0.3 specification as JSON.

**Auth**: None

---

### Public API (API Key + Rate Limited)

All endpoints below require the `X-API-Key` header and are rate limited to **100 requests/minute** per key/IP.

---

#### `GET /api/public/profiles`

Paginated list of user profiles.

**Query Params**:

- `limit` (int, default 10, max 100) -- Number of results
- `offset` (int, default 0) -- Pagination offset
- `tankLevel` (int, optional) -- Filter by tank level

**Response `200`**:

```json
{
  "data": [
    {
      "id": 1,
      "username": "TankMaster",
      "tankLevel": 12,
      "xp": 5400,
      "wins": 42,
      "gamesPlayed": 100,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { "total": 150, "limit": 10, "offset": 0, "hasMore": true }
}
```

---

#### `GET /api/public/profiles/[id]`

Get detailed profile by user ID, including last 10 game history entries.

**Path Params**: `id` -- user ID

**Response `200`**:

```json
{
  "data": {
    "id": 1,
    "username": "TankMaster",
    "tankColor": "#00ff00",
    "tankLevel": 12,
    "xp": 5400,
    "wins": 42,
    "gamesPlayed": 100,
    "isOnline": true,
    "lastSeen": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "gamesAsPlayer": [
      { "id": 1, "winnerId": 1, "playerScore": 10, "createdAt": "2024-01-01T00:00:00Z" }
    ]
  }
}
```

---

#### `PUT /api/public/profiles/[id]`

Update a user's tank color. Must be the profile owner.

**Path Params**: `id` -- user ID

**Request Body**:

```json
{ "tankColor": "#ff0000" }
```

**Response `200`**:

```json
{
  "message": "Profile updated successfully",
  "data": { "id": 1, "username": "TankMaster", "tankColor": "#ff0000", "tankLevel": 12 }
}
```

---

#### `DELETE /api/public/profiles/[id]`

Permanently delete a user account. Must be the account owner.

**Path Params**: `id` -- user ID

**Response `200`**: `{ "message": "Profile deleted successfully" }`

---

#### `GET /api/public/users`

Paginated list of users with optional username filter.

**Query Params**:

- `limit` (int, default 10, max 100) -- Number of results
- `offset` (int, default 0) -- Pagination offset
- `username` (string, optional) -- Case-insensitive partial match

**Response `200`**:

```json
{
  "data": [
    {
      "id": 1,
      "username": "TankMaster",
      "tankLevel": 5,
      "xp": 1200,
      "wins": 10,
      "gamesPlayed": 25,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { "total": 50, "limit": 10, "offset": 0, "hasMore": true }
}
```

---

#### `GET /api/public/users/[id]`

Get basic public info for a specific user.

**Path Params**: `id` -- user ID

**Response `200`**:

```json
{
  "data": {
    "id": 1,
    "username": "TankMaster",
    "tankLevel": 5,
    "xp": 1200,
    "wins": 10,
    "gamesPlayed": 25,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### `GET /api/public/users/[id]/stats`

Get game statistics for a user.

**Path Params**: `id` -- user ID

**Response `200`**:

```json
{
  "data": {
    "totalGames": 100,
    "totalWins": 42,
    "totalXp": 5400,
    "winRate": 42,
    "recentGames": [
      { "id": 1, "winnerId": 1, "playerScore": 10, "createdAt": "2024-01-01T00:00:00Z" }
    ]
  }
}
```

---

#### `GET /api/public/friends/[id]`

Get the accepted friends list for a specific user.

**Path Params**: `id` -- user ID

**Response `200`**:

```json
{
  "data": [
    {
      "id": 2,
      "username": "TankPro",
      "tankLevel": 8,
      "wins": 25,
      "isOnline": true,
      "lastSeen": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `GET /api/public/notifications/[id]`

Get paginated notifications for a specific user.

**Path Params**: `id` -- user ID

**Query Params**:

- `limit` (int, default 20, max 100)
- `offset` (int, default 0)
- `isRead` (boolean, optional)

**Response `200`**:

```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "type": "FRIEND_REQUEST",
      "title": "New friend request",
      "message": "TankPro sent you a friend request",
      "isRead": false,
      "data": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "unreadCount": 5,
  "pagination": { "total": 50, "limit": 20, "offset": 0, "hasMore": true }
}
```

---

#### `PUT /api/public/notifications/[id]`

Mark notifications as read for a specific user.

**Path Params**: `id` -- user ID

**Request Body** (one of):

```json
{ "markAllRead": true }
```

```json
{ "notificationIds": [1, 2, 3] }
```

**Response `200`**: `{ "message": "Notifications marked as read" }`

---

## Database Models

**User** -- Player account
- Key fields: id, username, email, password, avatar, isOnline, lastSeen, tankColor, tankLevel, xp, wins, kills, deaths, gamesPlayed
- Relations: GameHistory, Friendship (sent/received), ConversationParticipant, Message, ApiKey, Notification

**Friendship** -- Relationship between two users
- Key fields: id, status (PENDING/ACCEPTED/DECLINED/BLOCKED), senderId, receiverId
- Unique constraint on [senderId, receiverId]

**Conversation** -- Chat room
- Key fields: id, type (PRIVATE/GROUP), user1Id, user2Id
- Relations: Participants, Messages

**ConversationParticipant** -- User membership in a conversation
- Key fields: id, userId, conversationId, lastReadAt
- Unique constraint on [userId, conversationId]

**Message** -- Chat message
- Key fields: id, content, userId, conversationId
- Relations: MessageRead

**MessageRead** -- Read receipt
- Key fields: id, messageId, userId, readAt
- Unique constraint on [messageId, userId]

**GameHistory** -- Match result
- Key fields: id, playerId, winnerId, playerScore
- Relations: User (PlayerGames)

**ApiKey** -- Public API access token
- Key fields: id, name, key (unique), userId, isActive, expiresAt, lastUsedAt
- Relations: User

**Notification** -- User notification
- Key fields: id, userId, type (enum), title, message, isRead, data (JSON)
- Relations: User

---

## Socket.io Events

**`user-profile-updated`**
- Direction: Server -> Client
- Payload: Updated user fields
- Trigger: Avatar upload, username/color change

**`friend-notification`**
- Direction: Server -> Client
- Payload: Friendship data
- Trigger: Friend request sent/accepted/denied
