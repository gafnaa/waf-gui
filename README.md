# Gafnaa WAF Dashboard 🛡️

**Gafnaa WAF** is a modern, high-performance Web Application Firewall (WAF) management GUI designed for Nginx with ModSecurity. It provides a real-time, professional interface for security engineers to monitor traffic, analyze attacks, and manage security rules with precision.

![Dashboard Preview](https://via.placeholder.com/1200x600?text=Gafnaa+WAF+Dashboard+Preview)

## ✨ Key Features

### 📊 Real-time Monitoring

- **Live Traffic Analysis**: Visualize request trends, attack spikes, and system load in real-time.
- **Server Health**: Monitor CPU, RAM usage, and Nginx service status (Active/Reload/Restart).
- **Attack Insights**: Categorized breakdown of threats (SQL Injection, XSS, RCE, LFI, etc.).

### 📝 Advanced Logs Explorer

- **Live Tail**: Watch log events stream in real-time (CLI-style experience).
- **Smart Filtering**: Filter logs by Time Range (Last Hour, 3d, 7d), Attack Type, Status Code, or IP.
- **Detailed Inspection**: View full request details, including headers and payloads.
- **Export Capabilities**: Download filtered log datasets as CSV for external analysis.

### 🛠️ Rules Engine & Configuration

- **Core Rule Set (CRS) Control**: Easily toggle OWASP Core Rules categories.
- **Custom Rules Editor**: Integrated IDE-like editor for `custom_rules.conf` with:
  - Syntax-aware interface.
  - Line numbers and scrolling synchronization.
  - Dark mode aesthetic optimized for long coding sessions.
- **IP Access Control**: One-click blocking or allowing of specific IP addresses.

## 🚀 Tech Stack

**Frontend**

- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS (Dark Mode optimized)
- **Icons**: Lucide React
- **Charts**: Recharts
- **State/Routing**: React Router DOM, Axios

**Backend**

- **Core**: Python 3.10+ (FastAPI)
- **Server**: Uvicorn (ASGI)
- **System Utils**: Psutil (System monitoring), Subprocess (Nginx control)
- **Validation**: Pydantic

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
# Create a .env file based on the example below
```

**Environment Variables (`backend/.env`)**:

```env
ACCESS_LOG_PATH="./dummy_access.log"  # Path to Nginx access.log
WAF_CONFIG_PATH="./dummy_waf.conf"    # Path to custom_rules.conf
ALLOWED_ORIGINS=["http://localhost:5173"]
SECRET_KEY="your_secret_key"
```

**Run Backend**:

```bash
python app/main.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
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

## 📸 Screenshots

- **Overview Dashboard**: General stats and traffic charts.
- **Live Logs**: Real-time table with "Live Tail" mode active.
- **Rules Editor**: VSCode-like editor for ModSecurity rules.

## 🔒 Security Note

This dashboard possesses administrative capabilities (restarting services, editing WAF rules). **Do not expose this application to the public internet** without proper authentication (already implemented via Login flow) and network restrictions (VPN/IP Whitelist).

---

Built with ❤️ by the Gafnaa Team.
