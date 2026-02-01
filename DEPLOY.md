# DEPLOYMENT GUIDE (Vercel + Render)

Because this application uses **WebSockets** and a **Background Simulator**, the Backend cannot run on Vercel (which uses short-lived Serverless functions).

We will deploy the **Backend to Render** (Web Service).
For the Frontend, you can use **Vercel** (recommended for speed) OR **Render** (to keep everything in one place).

## 1. Backend Deployment (Render.com) - REQUIRED
*This must be done first to get the URL.*
1. Push this code to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) -> New -> **Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Environment Variables** (Add these):
     - `PYTHON_VERSION`: `3.11.9` (CRITICAL: Required for ML libraries)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Click **Deploy**.
6. Copy your new backend URL (e.g., `https://hackathon-1-backend.onrender.com`).

## 2. Frontend Deployment (Option A: Vercel - Recommended)
1. Go to [vercel.com](https://vercel.com) -> Add New -> Project.
2. Import your repo.
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Environment Variables**:
     - `VITE_WS_URL`: `wss://your-backend-url.onrender.com/ws`
4. Click **Deploy**.

## 3. Frontend Deployment (Option B: Render - All-in-One)
1. Go to Render Dashboard -> New -> **Static Site**.
2. Connect your repo.
3. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_WS_URL`: `wss://your-backend-url.onrender.com/ws`
4. Click **Deploy**.

## Why not Vercel for Backend?
Vercel Serverless functions typically timeout after 10-60 seconds. Our Payment Simulator needs to run continuously 24/7 to generate transactions and train the Student Model. Render/Railway/Heroku support persistent servers.
