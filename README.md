# Ceus Capital Technical Assessment - Chat Service
## Live Demo & Backend API

- **Frontend:** [https://chat-service-hub.vercel.app](https://chat-service-hub.vercel.app)  
  The main user interface hosted on Vercel.

- **Backend API:** [https://chat-service-fey9.onrender.com](https://chat-service-fey9.onrender.com)  
  The backend server providing API and WebSocket services.

## Video Demo
https://github.com/user-attachments/assets/5a162aa7-2769-49be-9929-c53b748d6ece

# Chat Setup Instructions

## Quick Start

Follow these steps to get Chat-ServiHub up and running:

### 1. Clone the Repository

```bash
git clone <url>
cd chat-servihub
```

### 2. Environment Configuration

#### Backend Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database connection string (PostgreSQL)
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>

# JWT secret key for authentication
JWT_SECRET=your_jwt_secret_here

# CORS origin allowed to access this API
CORS_ORIGIN=http://localhost:5173
```

#### Test Environment Setup

Copy the test environment file:

```bash
cp .env.test.example .env.test
```

Configure the `.env.test` file:

```env
# Database connection string (PostgreSQL)
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>

# JWT secret key for authentication
JWT_SECRET=your_jwt_secret_here
```

#### Frontend Environment Setup

Navigate to the frontend directory and set up the environment:

```bash
cd pretty-frontend
cp .env.example .env
```

Configure the `pretty-frontend/.env` file:

```env
# Backend url
REACT_APP_BACKEND_URL=http://localhost:3001
```

### 3. Build and Run with Docker

Return to the project root directory and start the application:

```bash
cd ..
docker-compose up --build -d
```

This command will:
- Build all necessary Docker images
- Start the application in detached mode
- Set up the database and backend services
- Launch the frontend application

### 4. Run Tests

Verify everything is working correctly by running the test suite:

```bash
npm test
```

## Configuration Details

### Database Configuration

The `DATABASE_URL` should be formatted as:
```
postgresql://username:password@host:port/database_name
```

Example:
```
postgresql://myuser:mypassword@localhost:5432/chatservihub
```

### JWT Secret

Generate a strong JWT secret for authentication. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS Configuration

Set `CORS_ORIGIN` to match your frontend URL:
- Development: `http://localhost:5173`
- Production: Your production domain

# ServiceHub Chat Service Documentation

## System Overview

**Tech Stack:**
- Backend: Fastify (Node.js)
- Database: Prisma ORM
- Authentication: JWT tokens (with time sensitive token expiry)
- Real-time: WebSocket connections
- Security: bcrypt password hashing, CORS configuration

**User Roles:**
- **CUSTOMER**: End users seeking support -> can create conversations
- **AGENT**: Business representatives providing support -> can view all conversations directed to their business
- **BUSINESS**: Service provider entities

---

## Core Workflow

### 1. User Registration & Authentication

```
Registration Options:
├── POST /register → General user registration
├── POST /register-business → Create business entity
└── POST /register-agent → Create agent linked to business

Authentication Flow:
1. POST /login with username/password
2. Server validates credentials
3. JWT token generated and returned
4. Token included in Authorization header for protected routes
```

### 2. Chat Creation Flow

```
Client Side:
1. Client views available businesses (GET /getAllBusinesses)
2. Client creates chat with business (POST /createClientChat)
3. System creates conversation and adds participants
4. Real-time notification sent to all agents

Agent Side:
1. Agent receives notification via WebSocket
2. Agent views all business chats (GET /getAgentChats)
3. Agent can delete conversations (DELETE /deleteChatForAll)
```

### 3. Messaging Workflow

```
Message Flow:
1. User sends message (POST /conversations/:id/messages)
2. System validates user is participant
3. Message stored in database
4. Real-time broadcast to all conversation participants
5. Read status tracking updated
```

### 4. Real-time Communication

```
WebSocket Connection:
1. Client connects with JWT token (ws://localhost:3001?token=<jwt>)
2. Server validates token and adds user to connected users
3. Welcome message and presence snapshot sent
4. Real-time events broadcast to relevant users

WebSocket Events:
├── Connection Events (WELCOME, PRESENCE_SNAPSHOT, PRESENCE_UPDATE)
├── Message Events (NEW_MESSAGE_BY_CUSTOMER, NEW_MESSAGE_BY_AGENT)
├── Status Events (UPDATED_READ_STATUS_OF_CUSTOMER, UPDATED_READ_STATUS_OF_AGENTS)
├── Chat Events (REFRESH_CHATS, TYPING)
└── Presence Events (user online/offline status)
```

---

## Feature List

### Authentication & User Management
-  JWT-based authentication with time sensitive token expiry
- User registration with role-based access control
- Business entity registration and management
- Agent registration with business association
- Password encryption using bcrypt
- User profile retrieval with business information protected by jwt

### Chat & Conversation Management
- Multi-type conversation support (SUPPORT, SALES, GENERAL)
- Client-initiated chat creation with businesses
- Automatic participant management
- Agent access to all business conversations
- Conversation deletion (agent-only)
- Participant listing and management

### Messaging System
- Message persistence and retrieval
- Multi-format message support (text, files, images, videos) extension possible (currently only text)
- Sender information inclusion and datetime metadata
- Dual read status tracking (customer/agent) and  `delivered` vs `read` display
- Bulk message read status updates

### Real-time Features
- WebSocket-based live communication
- JWT-authenticated WebSocket connections
- Real-time message broadcasting
- Live user presence tracking (`Online` vs `Offline`)
- Typing indicators (including for multiple concurrent typers
- Read receipt notifications real-time
- Connection state management
- Automatic cleanup on disconnect

### API & Integration
- RESTful API with exposed endpoints
- Health check endpoint

### Security Features
- JWT token validation for all protected routes
- Role-based authorization
- Secure password storage
- WebSocket authentication
- CORS protection
- Environment variable configuration
  
---

## Known Issues
- Using an internal connectedusers object and managing it manually instead of Redis pub/sub which is cleaner (?)/ might be more reliable
- Race conditions in websocket connection vs page loading (leads to that pop-up on the dashboard that forces the page to reload)  
- JWT tests use their own db via a url in `env.test` but it will be better to use mocks instead

## Improvements
- SSE Fallback
- Attachment and other message types
- Permission restriction for `Direct` conversationType (I was not sure what the requirements are exactly for this)
- Use mocks for jest tests
- More comprehensive/ fine grain error messages eg 'cannot allow duplicate usernames' instead of just returning `Bad Request`
- Send email to offline users (wasn't sure which email to use but I assume it should be straightforward by doing 1 extra endpoint with integration with SendGrid/Mailgun/AWS SES
  
---

## API Endpoints Summary

### Authentication
- `POST /login` - User authentication
- `GET /getUserDetails` - Get user profile

### Registration
- `POST /register` - General user registration
- `POST /register-business` - Business registration
- `POST /register-agent` - Agent registration

### Chat Management
- `GET /getClientChats` - Client's conversations
- `POST /createClientChat` - Create new chat
- `GET /getAgentChats` - Agent's conversations
- `DELETE /deleteChatForAll` - Delete conversation

### Messaging
- `GET /conversations/:id/messages` - Get conversation messages
- `POST /conversations/:id/messages` - Send message
- `PATCH /conversations/:id/messages/:messageId/read/customer` - Mark read by customer
- `PATCH /conversations/:id/messages/:messageId/read/agent` - Mark read by agent
- `GET /messages/:messageId` - Get specific message

### Utilities
- `GET /health` - Health check
- `GET /presence/online-users` - Online users list
- `GET /getAllBusinesses` - Business directory
- `POST /conversations/:id/typing` - Typing indicators
- `PATCH /conversations/:id/markAllAsRead/:role` - Bulk read status update
- `GET /conversations/:id/participants` - Conversation participants

### WebSocket
- `ws://localhost:3001?token=<jwt>` - Real-time communication

---

## Data Flow Architecture

```
Request → CORS Check → JWT Validation → Route Handler → Business Logic → Database (Prisma) → Response
                                                            ↓
WebSocket Broadcasting ← Real-time Events ← Data Changes ←
```
## Arhitecture Diagram
![image](https://github.com/user-attachments/assets/9478628b-b1ca-45b0-baec-87c00b0ab69a)

## Schema (from prismaliser)
![prismaliser](https://github.com/user-attachments/assets/419a0ef5-ac80-465b-8026-92ce9953699d)

# Testing and Coverage

![image](https://github.com/user-attachments/assets/a27ba511-38b5-4969-84f4-9acf93cc8369)

## Auth Endpoints Tests
- Should return 401 on invalid login
- Should login successfully and return JWT
- Should return user details for a valid user
- Should return 404 if user does not exist

## Register Endpoints Tests
- Should register a new user successfully
- Should not register with duplicate username
- Should not register an agent with a non-existing business ID
- Should register a business
- Should register an agent linked to an existing business

## Agent Chats API Tests
- Should return the agent's participant list when chats exist
- Should return an empty list if the agent has no chats
- Deletes chat for all participants and returns success

## Client Chats API Tests
- Should create a participant (and conversation) for a valid client and business
- Should return 400 for missing businessId
- Should return 400 for missing conversationType
- Should return 400 for non-existing businessId
- Should return the participant list when chats exist

## General User Services Routes Tests
- GET /presence/online-users returns empty initially
- GET /conversations/:id/participants returns all participants
- PATCH /conversations/:id/markAllAsRead/AGENT marks unread messages as read by agents
- PATCH /conversations/:id/markAllAsRead/CUSTOMER marks unread messages as read by customer
- POST /conversations/:id/typing returns success even if no sockets are connected
- GET /getAllBusinesses returns the test business

## Message Routes Tests
- GET /conversations/:id/messages
   - Returns 200 and messages if conversation exists
   - Returns 404 if conversation does not exist
- POST /conversations/:id/messages
   - Creates a new message and returns 201
   - Returns 400 if no content provided
- PATCH /conversations/:cid/messages/:mid/read/customer
   - Marks message as read and returns updated message
- GET /messages/:id
   - Returns message by ID
   - Returns 404 if message not found
