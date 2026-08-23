# Fiverr Message Sanitizer — Full-Stack Edition

A full-stack rebuild of the original React-only Fiverr Message Sanitizer.
It now has real accounts, a MongoDB-backed workspace of user-created tabs,
and every sanitized message you save is persisted and synced from the
database. The UI is a redesigned, fully responsive dashboard (desktop,
laptop, tablet, and mobile).

## What's included

**Backend** — `server/` (Node.js + Express + MongoDB/Mongoose)
- JWT authentication (register / login / me)
- Password hashing with bcrypt
- Tabs API (create, rename, delete — scoped to the logged-in user)
- Saved-message API, nested under each tab (create, list, delete)
- Account settings API (update name/email, change password, delete account
  — which also cascades and deletes that user's tabs and saved messages)

**Frontend** — `client/` (React 19 + Vite + React Router)
- Login / Register pages
- A dashboard shell: a sidebar of your tabs, a top bar, and the sanitizer
  editor (grammar suggestions, spelling fixes, reserved-keyword warnings,
  Bengali translation, read-aloud, copy — all ported from the original app)
- "Save to Tab" persists the sanitized message to MongoDB under the active
  tab; saved messages are listed below the editor and sync from the database
- Clicking the avatar opens a modal with: edit name/email, change password,
  delete account (danger zone), and Log Out
- Fully responsive: the sidebar becomes an off-canvas drawer on tablet/mobile

## Prerequisites

- Node.js 18+
- A MongoDB database — either:
  - a local install (`mongod` running on `mongodb://127.0.0.1:27017`), or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a
    connection string from there)

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — replace with a long random string (e.g. run
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  and paste the output)

Start the API server:

```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start
```

The API runs on `http://localhost:5000` by default. Visit
`http://localhost:5000/api/health` to confirm it's up.

## 2. Frontend setup

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`. Vite is already configured to
proxy `/api` requests to `http://localhost:5000`, so the two run together
with no extra config out of the box.

Register a new account, create a tab from the sidebar, sanitize a message,
and click **Save to Tab** — it will now persist in MongoDB and reload the
next time you log in from anywhere.

## 3. Building for production

```bash
cd client
npm run build     # outputs client/dist
```

Serve `client/dist` with any static host (or have Express serve it) and
point `CLIENT_ORIGIN` in `server/.env` at that production URL. Deploy the
`server/` folder to any Node host (Render, Railway, Fly.io, a VPS, etc.)
alongside your MongoDB instance.

## Project structure

```
fiverr-sanitizer-fullstack/
├── server/
│   ├── config/db.js          MongoDB connection
│   ├── models/               User, Tab, Message (Mongoose schemas)
│   ├── middleware/           JWT auth guard, error handler
│   ├── routes/                auth, users (settings), tabs (+ nested messages)
│   ├── utils/generateToken.js
│   └── index.js               Express app entry point
└── client/
    └── src/
        ├── api/axios.js       axios instance, attaches JWT automatically
        ├── context/AuthContext.jsx
        ├── pages/             Login, Register, Dashboard
        ├── components/        Sidebar, TopBar, Editor, SavedMessages,
        │                      AccountModal, ProtectedRoute
        ├── lib/                original sanitizer/grammar/reserved-keyword
        │                      logic, ported unchanged from the source app
        └── styles/index.css    full design system + responsive layout
```

## Notes

- Tokens are stored in `localStorage` and attached to every API request
  automatically.
- Deleting a tab cascades and deletes its saved messages. Deleting your
  account cascades and deletes all of your tabs and saved messages.
- The client-side sanitizing/grammar/translation logic is unchanged from
  the original app — only persistence, auth, and the UI shell are new.
