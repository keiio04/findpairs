# Flip & Match: Deployment & Virtualization Guide

This guide provides instructions for deploying the Flip & Match system across local and cloud environments.

## 1. Local Development Setup

### Prerequisites
*   Python 3.10+
*   Node.js (for frontend serving)

### Installation
1.  **Clone the repository.**
2.  **Setup Backend:**
    ```powershell
    cd backend
    pip install -r requirements.txt
    python app.py
    ```
3.  **Setup Frontend:**
    ```powershell
    # In the root directory
    python -m http.server 8080
    ```

---

## 2. Containerization (Virtualization)

The project includes a `Dockerfile` for standardized deployment across any environment.

### Build Docker Image
```powershell
docker build -t flipmatch-backend .
```

### Run Container
```powershell
docker run -p 5000:5000 flipmatch-backend
```

### Why use Docker for ITEL 305?
*   **Isolation:** Ensures the app runs the same on the professor's machine as it does on yours.
*   **Scalability:** Allows the backend to be scaled horizontally across multiple cloud instances.

---

## 3. Cloud Deployment (Render / AWS)

### Automated Cloud Deployment (CI/CD)
1.  **Push to GitHub:** Ensure your latest code is in a public or private GitHub repository.
2.  **Connect to Render:**
    *   Create a new **Web Service**.
    *   Select your GitHub repository.
    *   **Build Command:** `pip install -r backend/requirements.txt`
    *   **Start Command:** `python backend/app.py` (or use Gunicorn for production).
3.  **Environment Variables:**
    *   Set `JWT_SECRET_KEY` to a secure random string.
    *   Set `ENCRYPTION_KEY` for AES-256 persistence.

---

## 4. Mobile PWA Installation

The system is designed as a **Progressive Web App (PWA)** to meet the Mobile Development requirements.

### Installation Steps:
1.  Open the deployed URL (e.g., `https://findpairss.onrender.com`) in Chrome on Android or Safari on iOS.
2.  **Android:** Click the "Install App" or "Add to Home Screen" banner.
3.  **iOS:** Click the "Share" icon and select "Add to Home Screen."
4.  **Result:** The game will now appear in your app drawer and work with offline fallback capabilities.

---

## 5. Maintenance & Monitoring

### Database Maintenance
Use the included utility script to ensure schema integrity:
```powershell
python backend/organize_db.py
```

### API Health Check
Visit `/api/v1/stats/global` to verify that the core service is online and responding.
