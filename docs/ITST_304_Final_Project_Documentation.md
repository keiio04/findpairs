# Flip & Match: Nilalang Chronicles
## ITST 304 – Mobile Computing: Final Project Documentation

**Project Overview:**
"Flip & Match" is a horror-themed, mobile-capable web application that utilizes modern mobile computing technologies to provide an immersive, app-like experience. This system demonstrates mastery of Progressive Web Application (PWA) concepts, real-time push notifications, and secure mobile-backend synchronization.

---

## 1. System Integration & Architecture (SIA)

### Architectural Pattern: RESTful API & Shared Core
The system follows a **Centralized Backend Architecture**. Both the web dashboard and the mobile PWA interface share the same Python (Flask) backend and SQLite database.
*   **One-System Logic:** Data is not isolated; a match played on a desktop browser is instantly visible in the mobile history dahil pareho silang kumakausap sa iisang RESTful API (`/api/v1`).
*   **Isolated Modules Avoidance:** Lahat ng requests ay dumadaan sa centralized API gateway para sa consistency ng data.

### High-Level Architecture Diagram (Logical)
*   **Data Layer:** SQLite with AES-256 encrypted settings.
*   **Application Layer:** Flask Core Service (API Engine).
*   **Presentation Layer:** HTML5/CSS3/Vanilla JS (Responsive Mobile UI).
*   **Cloud Infrastructure:** Dockerized environment ready for Render/AWS.

---

## 2. Technical Implementation (Mobile Computing)

### A. Progressive Web Application (PWA)
1.  **Web App Manifest (`manifest.json`):** Pinapayagan ang installation sa Android/iOS home screens.
2.  **Service Worker (`sw.js`):** Implements **Offline Functionality**. Nag-ca-cache ng images at scripts para playable kahit walang net.
3.  **App Shell Model:** Mabilis na loading ng UI para sa "Native App" feel.

### B. Push Notifications (Firebase Cloud Messaging)
*   **Background Events:** Ang Service Worker ay nakikinig sa `push` events. Lalabas ang notification banner kahit sarado ang browser.
*   **Demonstration:** Gumagamit ng DevTools simulation para ipakita ang background notification handling.

---

## 3. Information Assurance & Security Strategy

### Data Security (ITEL 305 Compliance)
*   **Data at Rest:** Encryption via **AES-256 (Fernet)** para sa sensitive user settings.
*   **Data in Transit:** Secured via HTTPS/TLS protocols.
*   **Access Control:** Implements **JWT (JSON Web Tokens)** para sa secure at stateless sessions.

### Threat Modeling
1.  **API Abuse:** JWT verification prevents unauthorized access.
2.  **Data Theft:** Encrypted columns ensure data remains secure even if the database is leaked.

---

## 4. Reliability & Sustainability Plan

### Scalability & Maintainability
*   **Virtualization (Docker):** Containerized setup para sa madaling deployment at cloud auto-scaling.
*   **Modular Code:** Hiwalay ang Auth, Models, at Main Logic para sa madaling maintenance.

### Disaster Recovery
*   **Cloud Persistence:** Ready for automated database backups.
*   **Failover Strategy:** Ang PWA architecture ay nagsisilbing fallback para sa offline usage.

---

## 5. Mobile Features Demonstration Guide
1.  **Installation:** Ipakita ang "Add to Home Screen" feature.
2.  **Offline Play:** I-check ang "Offline" sa DevTools at ipakita na naglo-load pa rin ang game.
3.  **Push Notification:** I-trigger ang simulation sa `Application -> Service Workers`.
4.  **Security Sync:** Ipakita ang encrypted data sa `database.db` gamit ang `organize_db.py`.
