# 🏗️ Constructrack

**AI-Powered Offline-First PWA for Construction Project Tracking**

Constructrack monitors construction progress in real-time, functioning seamlessly offline. It empowers engineers to track delays using AI risk analysis and allows workers to quickly capture site evidence via QR codes.

## 🚀 Key Features
- **Offline-First**: Works without signal. Queues photos and syncs when online.
- **AI Risk Analysis**: Analyzes photo quality and relevance to flag delays (Red/Yellow/Green).
- **Real-Time Dashboard**: Live Gantt charts and geospatial maps for engineers.
- **Automated Alerts**: Sends WhatsApp notifications when critical delays are detected.

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- Firebase Project (Firestore & Storage enabled)
- Google Cloud API Key (Vision API)
- Hugging Face API Key (Inference API)

### 2. Installation
```bash
git clone <repo-url>
cd Constructrack
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (copy `.env.example`):

```env
# Firebase Config
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id

# AI Services
VITE_GOOGLE_CLOUD_API_KEY=your_google_key
VITE_HF_API_KEY=your_huggingface_key

# WhatsApp Alerts (Optional)
VITE_WHATSAPP_TOKEN=your_meta_token
VITE_WHATSAPP_PHONE_ID=your_phone_id
```

### 4. Running Locally
```bash
npm run dev
```
Access at `http://localhost:5173`

### 5. Deployment
```bash
npm run build
firebase deploy
```

---



## 🔧 Troubleshooting

**1. Map Pins Not Showing**
- Ensure `VITE_GOOGLE_CLOUD_API_KEY` is set if using Google Maps (though we default to OpenStreetMap/Leaflet).
- Verify photos have GPS data (Check browser permissions for Location).

**2. AI Features Not Working**
- Check Console. If API keys are missing, the app falls back to "Demo Mode" (random scores/captions).
- Ensure Hugging Face API limits aren't exceeded.

**3. App Not Working Offline**
- Ensure you've visited the page at least once to allow the Service Worker to install.
- Check "Application" tab in DevTools -> "Service Workers" to verify it's active.

**4. WhatsApp Alerts Not Sending**
- Verify the recipient phone number is verified in the Meta Developer Console (sandbox mode).
- Check the console for `400/401` errors regarding the JWT token.
