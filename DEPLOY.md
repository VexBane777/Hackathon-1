# DEPLOYMENT GUIDE (Vercel + Render)

Because this application uses **WebSockets** and a **Background Simulator**, the Backend cannot run on Vercel (which uses short-lived Serverless functions).

We will deploy the **Frontend to Vercel** and the **Backend to Render** (Free Tier).

## 1. Backend Deployment (Render.com)
1. Push this code to GitHub (already done).
2. Go to [dashboard.render.com](https://dashboard.render.com) -> New -> **Web Service**.
3. Connect your GitHub repo `VexBane777/Hackathon-1`.
4. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Click **Deploy**.
6. Copy your new backend URL (e.g., `https://hackathon-1-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)
1. Go to [vercel.com](https://vercel.com) -> Add New -> Project.
2. Import `VexBane777/Hackathon-1`.
3. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (Click Edit)
   - **Environment Variables**:
     - Name: `VITE_WS_URL`
     - Value: `wss://hackathon-1-backend.onrender.com/ws`  
       *(Replace with your actual Render URL, changing 'https' to 'wss')*
4. Click **Deploy**.

## Why not Vercel for Backend?
Vercel Serverless functions typically timeout after 10-60 seconds. Our Payment Simulator needs to run continuously 24/7 to generate transactions and train the Student Model. Render/Railway/Heroku support persistent servers.
