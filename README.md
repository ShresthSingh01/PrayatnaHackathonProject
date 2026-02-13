# 🏗️ Constructrack

**AI-Powered Offline-First PWA for Construction Project Tracking**

Constructrack monitors construction progress in real-time, even in remote areas with zero connectivity. It empowers engineers to track delays using AI risk analysis and allows workers to quickly capture site evidence via QR codes.

---

## 🚀 Key Features

### 1. **Offline-First Architecture**
- **Zero Connectivity Required**: Works seamlessly without internet.
- **Local Queue**: Photos and data are stored locally and auto-synced when online.
- **Service Worker**: PWA capabilities for full offline access.

### 2. **Engineer Dashboard**
- **Real-Time Tracking**: Monitor multiple projects (Metro, Highway, Building).
- **Auto-Risk Analysis**: AI analyzes photo metadata and quantity to flag delays (Red/Yellow/Green).
- **Gantt Charts**: Visual timeline of project progress.
- **Instant Project Creation**: Use pre-built templates for rapid setup.

### 3. **Worker App**
- **QR Code Check-In**: Scan project QR codes to instantly join a site.
- **Flexible Capture**:
  - **Camera**: Direct photo capture.
  - **File Upload**: Upload existing photos or QR screenshots.
  - **Manual Entry**: Fallback for devices without cameras.
- **Geo-Tagging**: Automatically captures GPS coordinates for every photo.

### 4. **Demo Mode (Hackathon Ready)**
- **No Backend Config Needed**: Pre-configured with persistent local storage mock data.
- **Instant Testing**: Create projects and upload photos immediately after `npm run dev`.

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v18+)

### 2. Installation
```bash
git clone <repo-url>
cd Constructrack
npm install
```

### 3. Running Locally
```bash
npm run dev
```
Access at `http://localhost:5173`

*(Note: The app defaults to "Mock Mode" for stable demonstration. Real Firebase integration can be enabled via `.env`)*

---

## 📱 User Guide

### **Engineer Flow:**
1. Open the dashboard.
2. Click **"New Project"**.
3. Select a template (e.g., Metro, Highway) and click **"Create"**.
4. View the project details, Gantt chart, and Site Risks.

### **Worker Flow:**
1. Navigate to `/capture` (or click "Worker View").
2. **Scan the Project QR Code** displayed on the Engineer Dashboard.
   *(Or upload a screenshot of the QR / enter Project ID manually)*.
3. **Capture Photos** of site progress.
4. Photos will appear on the Engineer Dashboard instantly (or sync when online).

---

#Complete Demo App for Hackathon Purpose

