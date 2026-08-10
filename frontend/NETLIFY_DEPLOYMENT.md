# 🚀 Netlify Deployment Guide for Prescripto Frontend

This guide provides step-by-step instructions and build/publish directory configurations to deploy the **Prescripto Frontend** to **Netlify**.

---

## 🛠️ Netlify Dashboard Configuration

When linking your GitHub repository (`https://github.com/bakshay96/Prescripto.git`) to Netlify:

### Build & Deploy Settings

| Configuration Option | Recommended Setting | Description |
| :--- | :--- | :--- |
| **Base Directory** | `frontend` | Sets the working directory to the frontend folder |
| **Build Command** | `npm run build` *(for Next.js)* **OR** leave empty *(for Static App)* | Builds production output bundle |
| **Publish Directory** | `frontend` (or `.` if Base Directory is `frontend`) | Location of deployed static HTML/CSS/JS assets |
| **Functions Directory** | `frontend/functions` *(optional)* | Directory for Netlify serverless functions |

---

## 📄 Pre-configured Files Included in Repository

1. **`netlify.toml`** (Root & `frontend/`):
   ```toml
   [build]
     base = "frontend"
     publish = "."

   [build.environment]
     NODE_VERSION = "20"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **`_redirects`** (`frontend/_redirects`):
   ```
   /*    /index.html   200
   ```

---

## 🌐 Netlify Environment Variables

In your Netlify Site Settings $\rightarrow$ **Environment Variables**, add:

```ini
NEXT_PUBLIC_API_BASE_URL="https://your-backend-api.onrender.com/api/v1"
NEXT_PUBLIC_GRAPHQL_URL="https://your-backend-api.onrender.com/graphql"
```

---

## ⚡ Quick Deployment Steps via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Login to Netlify:
   ```bash
   netlify login
   ```
3. Deploy from `frontend` directory:
   ```bash
   cd frontend
   netlify deploy --dir=. --prod
   ```
