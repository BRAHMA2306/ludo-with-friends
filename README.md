# Ludo Multiplayer Game

A real-time multiplayer Ludo game built with a modern web stack. Players can create rooms, share the code, and play Ludo in real time right in their browser on both desktop and mobile devices.

## Features
- **Real-Time Multiplayer:** Using Socket.io for live updates.
- **Server Authoritative:** Game logic and dice rolls are handled on the server to prevent cheating.
- **Mobile Responsive:** Adapts to desktop and mobile layouts using TailwindCSS.
- **Smooth Animations:** Framer Motion handles token movements and dice rolling animations.
- **Live Chat:** Simple room chat for players in the lobby and game.
- **State Management:** Redis for game state, with an in-memory fallback.

## Tech Stack
**Frontend:**
- Next.js (React)
- TailwindCSS
- Framer Motion
- Socket.io-client

**Backend:**
- Node.js
- Express.js
- Socket.io
- Redis (optional, falls back to in-memory)

## Getting Started

### Prerequisites
- Node.js (v18+)
- Redis (optional)

### Setup & Run Locally

1. **Install dependencies for Backend:**
   \`\`\`bash
   cd backend
   npm install
   \`\`\`

2. **Start Backend Server:**
   \`\`\`bash
   cd backend
   node server.js
   \`\`\`
   The server will run on \`http://localhost:4000\`.

3. **Install dependencies for Frontend:**
   \`\`\`bash
   cd frontend
   npm install
   \`\`\`

4. **Start Frontend Server:**
   \`\`\`bash
   cd frontend
   npm run build
   npx next start
   \`\`\`
   The client will run on \`http://localhost:3000\`.

### Environment Variables
You can configure a \`.env\` file in the \`backend\` folder with:
\`\`\`env
PORT=4000
REDIS_URL=redis://127.0.0.1:6379
\`\`\`

In the \`frontend\` folder, you can configure:
\`\`\`env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
\`\`\`

## Deployment Instructions

### Deploying the Backend
1. **Render / Railway / Heroku:**
   - Push your code to a Git repository.
   - Create a new Web Service and connect the repository, point it to the \`backend\` folder.
   - Set the Build Command: \`npm install\`
   - Set the Start Command: \`node server.js\`
   - Make sure to enable WebSockets if required by the hosting provider.
   - Set the \`REDIS_URL\` environment variable if using a managed Redis instance.

### Deploying the Frontend
1. **Vercel:**
   - Push your code to a Git repository.
   - Import the project into Vercel.
   - Set the Root Directory to \`frontend\`.
   - Vercel will automatically detect Next.js.
   - Add the \`NEXT_PUBLIC_SOCKET_URL\` environment variable to point to your deployed backend URL.
   - Deploy.

## Folder Structure
- \`/frontend\`: Next.js React application.
- \`/backend\`: Node.js Express + Socket.io server.
- \`/shared\`: Shared game logic and constants between frontend and backend.
