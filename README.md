# EcoPlastic MERN

EcoPlastic is now configured for React + Vite frontend, Node.js + Express backend, and MongoDB Atlas.

## 1. Backend
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and add your private MongoDB Atlas URI and a long JWT secret.

```bash
npm run dev
```

Backend health check: `http://localhost:5000/api/health`

## 2. Frontend
Open a second terminal in the project root:
```bash
npm install
npm run dev
```

The frontend defaults to `http://localhost:5000/api`.

## Important
- Firebase has been removed from this package.
- Never commit `server/.env`.
- No OTP is used.
- Roles: customer, driver, buyer, admin.
