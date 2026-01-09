# Modern WAF Management Dashboard 🛡️

A high-performance, real-time Web Application Firewall (WAF) management interface designed for Nginx with ModSecurity. This dashboard provides a professional environment for security engineers to monitor traffic, analyze threats, and manage security rules with precision.

## ✨ Key Features

### 📊 Real-time Monitoring

- **Live Traffic Analysis**: Visualize request trends, attack spikes, and system load in real-time.
- **Server Health**: Monitor CPU, RAM usage, and Nginx service status (Active/Reload/Restart).
- **Attack Insights**: Categorized breakdown of threats (SQL Injection, XSS, RCE, LFI, etc.).

### 📝 Advanced Logs Explorer

- **Live Tail**: Watch log events stream in real-time (CLI-style experience).
- **Smart Filtering**: Filter logs by Time Range (Last Hour, 3d, 7d), Attack Type, Status Code, or IP.
- **Detailed Inspection**: View full request details, including headers and payloads.
- **Export Capabilities**: Download filtered log datasets as HTML and CSV for external analysis.

### 🛠️ Rules Engine & Configuration

- **Core Rule Set (CRS) Control**: Easily toggle OWASP Core Rules categories.
- **Custom Rules Editor**: Integrated IDE-like editor for `custom_rules.conf` with:
  - Syntax-aware interface.
  - Line numbers and scrolling synchronization.
- **IP Access Control**: One-click blocking or allowing of specific IP addresses.
- **Hotlink Protection**: Manage image/resource hotlinking settings easily.

### 🔔 Modern UX

- **Custom Notifications**: Real-time non-blocking toast notifications for system events and actions.
- **Dark Mode**: Aesthetic interface optimized for long security monitoring sessions.

## 🚀 Tech Stack

**Frontend**

- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **State/Routing**: React Router DOM, Axios

**Backend**

- **Core**: Python 3.10+ (FastAPI)
- **Server**: Uvicorn (ASGI)
- **System Utils**: Psutil (System monitoring), Subprocess (Nginx control)
- **Validation**: Pydantic
- **Database**: SQLite (via SQLAlchemy)

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.9+
- Node.js 16+ & npm
- Nginx (with ModSecurity enabled)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# Activate (Windows)
venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment
# Create a .env file
```

**Environment Variables (`backend/.env`)**:

```env
ACCESS_LOG_PATH="./dummy_access.log"  # Path to Nginx access.log
WAF_CONFIG_PATH="./dummy_waf.conf"    # Path to custom_rules.conf
ALLOWED_ORIGINS=["http://localhost:5173"]
SECRET_KEY="your_secret_key"
DATABASE_URL="sqlite:///./waf_data.db"
```

**Run Backend**:

```bash
python app/main.py
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run Development Server
npm run dev
```

Access the dashboard at `http://localhost:5173`.

## 🔒 Security Note

This dashboard possesses administrative capabilities (restarting services, editing WAF rules). **Do not expose this application to the public internet** without proper authentication and network restrictions (VPN/IP Whitelist).

## LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by gafnaa
