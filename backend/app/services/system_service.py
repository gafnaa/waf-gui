import subprocess
import random # Masih dipakai untuk fallback jika psutil error, tapi utamanya pakai data real
import os
import psutil
import time
import json
import re
from datetime import datetime, timedelta
from app.core.config import get_settings
from app.db import get_db_connection

settings = get_settings()

# --- Configuration Files (Priority: dev/windows -> .env -> Default Linux) ---
if os.name == 'nt':
    # MODE DEVELOPMENT (Laptop/Windows)
    PREFIX = os.path.join(os.path.dirname(__file__), "..", "..")
    IP_RULES_FILE = os.path.join(PREFIX, "dummy_ip_rules.caddy")
    EXCLUSION_FILE = os.path.join(PREFIX, "dummy_waf_exclusions.conf")
    CUSTOM_RULES_FILE = os.path.join(PREFIX, "custom_rules.conf")
    HOTLINK_CADDY_FILE = os.path.join(PREFIX, "hotlink.caddy")
elif os.getenv("WAF_CONFIG_PATH"):
    # MODE PRODUKSI (Via .env override)
    EXCLUSION_FILE = os.getenv("WAF_CONFIG_PATH")
    HOTLINK_CADDY_FILE = os.getenv("HOTLINK_CONFIG_PATH", "/etc/caddy/hotlink.conf")
    IP_RULES_FILE = os.getenv("IP_RULES_CONFIG_PATH", "/etc/caddy/ip_rules.conf")
    CUSTOM_RULES_FILE = os.getenv("CUSTOM_RULES_CONFIG_PATH", "/etc/caddy/custom_rules.conf")
else:
    # MODE PRODUKSI (Default Linux Standard)
    IP_RULES_FILE = "/etc/caddy/ip_rules.caddy"
    EXCLUSION_FILE = "/etc/caddy/waf_exclusions.conf"
    CUSTOM_RULES_FILE = "/etc/caddy/custom_rules.conf"
    HOTLINK_CADDY_FILE = "/etc/caddy/hotlink.caddy"

# --- Static Definitions ---
WAF_RULES_DB = [
    {"id": "SQL-01", "name": "SQL Injection", "desc": "Blocks common SQL injection vectors (OWASP A03)", "category": "Injection", "enabled": True},
    {"id": "XSS-02", "name": "Cross-Site Scripting (XSS)", "desc": "Filters malicious scripts in headers and body parameters (OWASP A07)", "category": "Injection", "enabled": True},
    {"id": "LFI-03", "name": "Local File Inclusion", "desc": "Prevents access to sensitive system files via path manipulation", "category": "System", "enabled": True},
    {"id": "RCE-04", "name": "Remote Code Execution", "desc": "Detects and blocks OS command injection attempts", "category": "System", "enabled": True},
    {"id": "BOT-05", "name": "Bad Bots & Crawlers", "desc": "Blocks known scraper user-agents and aggressive crawling", "category": "Bot", "enabled": True},
    {"id": "BF-06", "name": "Brute Force Protection", "desc": "Mitigates credential stuffing and rapid login attempts", "category": "Auth", "enabled": True},
    {"id": "DOS-07", "name": "HTTP Flood Protection", "desc": "Rate limiting based on IP to mitigate DoS (OWASP A04)", "category": "DoS", "enabled": True},
    {"id": "PROTO-08", "name": "HTTP Protocol Violations", "desc": "Blocks malformed requests, invalid headers/methods (OWASP A06)", "category": "Protocol", "enabled": True},
    {"id": "HOTLINK-09", "name": "Hotlink Protection", "desc": "Prevents bandwidth theft by blocking unauthorized cross-site image linking", "category": "Resource", "enabled": False},
]

# --- Helper Functions ---

def restart_caddy():
    """Reload Caddy safely via sudo"""
    try:
        # Gunakan capture_output untuk menangkap pesan error jika config caddy salah
        result = subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "caddy"], capture_output=True, text=True, check=True)
        return {"status": "success", "message": "Caddy reloaded successfully"}
    except subprocess.CalledProcessError as e:
        # Kembalikan pesan error asli dari Caddy
        return {"status": "error", "message": f"Caddy Reload Failed: {e.stderr}"}
    except FileNotFoundError:
        return {"status": "warning", "message": "Caddy binary not found (Dev Mode)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def sync_ip_rules_file():
    """Generates Nginx config file from DB"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute("SELECT * FROM ip_rules WHERE status = 'Active'").fetchall()
        
        # Ensure dir exists (hanya jika path-nya absolut)
        if os.path.isabs(IP_RULES_FILE):
            os.makedirs(os.path.dirname(IP_RULES_FILE), exist_ok=True)
        
        with open(IP_RULES_FILE, "w") as f:
            f.write(f"# Auto-generated from WAF GUI DB at {datetime.now()}\n")
            f.write("# Do not edit manually.\n\n")
            
            # Caddy format:
            # (ip_filter) {
            #   @denied {
            #     remote_ip 1.2.3.4
            #   }
            #   respond @denied 403
            # }
            
            denied_ips = [r['ip'] for r in rows if r['action'] == 'deny']
            
            if denied_ips:
                f.write("(ip_filter) {\n")
                f.write("    @denied_ips {\n")
                for ip in denied_ips:
                    f.write(f"        remote_ip {ip}\n")
                f.write("    }\n")
                f.write("    respond @denied_ips 403\n")
                f.write("}\n")
            else:
                f.write("(ip_filter) {\n    # No rules active\n}\n")
    except Exception as e:
        print(f"Error syncing IP rules: {e}")

def sync_exclusions_file():
    """Generates WAF exclusions file from DB"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute("SELECT rule_id FROM waf_rule_toggles WHERE enabled = 0").fetchall()
        
        disabled_ids = [r['rule_id'] for r in rows]
        
        if os.path.isabs(EXCLUSION_FILE):
            os.makedirs(os.path.dirname(EXCLUSION_FILE), exist_ok=True)
        
        with open(EXCLUSION_FILE, "w") as f:
            f.write(f"# Auto-generated WAF Exclusions at {datetime.now()}\n")
            for rule_id in disabled_ids:
                # Mapping ID Internal dashboard ke ID OWASP CRS (Jika perlu mapping khusus)
                # Disini kita asumsikan ID di DB (misal 942000) sudah sesuai CRS
                # Tapi karena di WAF_RULES_DB ID-nya string teks (SQL-01), kita perlu logic mapping
                # Sesuai diskusi sebelumnya, kita pakai ID generik atau list ID CRS
                # Untuk prototype ini, kita tulis comment saja dulu jika ID nya bukan angka
                if rule_id.isdigit():
                    f.write(f"SecRuleRemoveById {rule_id}\n")
                else:
                    f.write(f"# Rule {rule_id} disabled (Manual config required for named groups)\n")
    except Exception as e:
        print(f"Error syncing exclusions: {e}")

# --- Service Functions ---

def add_waf_rule(ip_address: str, action: str, note: str = "", duration: str = "Permanent"):
    if action not in ["deny", "allow"]:
        return {"status": "error", "message": "Action must be 'deny' or 'allow'"}
    
    if not ip_address:
        return {"status": "error", "message": "IP Address is required"}

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM ip_rules WHERE ip = ?", (ip_address,))
            if cursor.fetchone():
                return {"status": "error", "message": f"Rule for {ip_address} already exists"}
            
            region = "Local" # Di real app bisa pakai GeoIP library
            
            cursor.execute(
                "INSERT INTO ip_rules (ip, action, note, duration, region) VALUES (?, ?, ?, ?, ?)",
                (ip_address, action, note, duration, region)
            )
            conn.commit()
            
        sync_ip_rules_file()
        restart_caddy()
        return {"status": "success", "message": f"Rule added for {ip_address}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_ip_rules():
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM ip_rules ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]

def delete_ip_rule(ip_address: str):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ip_rules WHERE ip = ?", (ip_address,))
            if cursor.rowcount == 0:
                return {"status": "error", "message": "IP Rule not found"}
            conn.commit()
            
        sync_ip_rules_file()
        restart_caddy()
        return {"status": "success", "message": f"Rule removed for {ip_address}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_waf_rules():
    rules = [r.copy() for r in WAF_RULES_DB]
    with get_db_connection() as conn:
        rows = conn.execute("SELECT rule_id, enabled FROM waf_rule_toggles").fetchall()
        db_state = {r['rule_id']: bool(r['enabled']) for r in rows}
    
    for rule in rules:
        if rule['id'] in db_state:
            rule['enabled'] = db_state[rule['id']]
    return rules

def toggle_rule(rule_id: str, enable: bool):
    rule = next((r for r in WAF_RULES_DB if r['id'] == rule_id), None)
    if not rule:
        return {"status": "error", "message": "Rule ID not found"}
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO waf_rule_toggles (rule_id, enabled) VALUES (?, ?)",
                (rule_id, 1 if enable else 0)
            )
            conn.commit()
            
        sync_exclusions_file()
        restart_caddy()
        
        status_msg = "Enabled" if enable else "Disabled"
        return {"status": "success", "message": f"Rule {rule['name']} is now {status_msg}"}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_hotlink_config():
    default_config = {
        "extensions": ["jpg", "jpeg", "png", "gif", "ico", "webp"],
        "domains": ["google.com", "bing.com", "yahoo.com"]
    }
    with get_db_connection() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = 'hotlink_config'").fetchone()
        if row:
            try:
                return json.loads(row['value'])
            except:
                pass
    return default_config

def save_hotlink_config(config: dict):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                ("hotlink_config", json.dumps(config))
            )
            conn.commit()

        # Caddy format for Hotlink
        # @hotlink {
        #   not header_regexp Referer "^https?://(www\.)?(google\.com|bing\.com)"
        #   path *.jpg *.png
        # }
        # respond @hotlink 403
        
        # Prepare regex for domains
        if config.get("domains"):
            escaped_domains = [re.escape(d) for d in config.get("domains", [])]
            domain_regex_part = "|".join(escaped_domains)
            # Basic regex to match http/https and optional www
            regex_str = f"^https?://(www\.)?({domain_regex_part})"
        else:
            regex_str = "^$" # Block all if no domains allowed (or handle differently)
            
        exts = " ".join([f"*.{e}" for e in config.get("extensions", [])])

        caddy_conf = f"""# Auto-generated Hotlink Rules
# Do not edit manually

(hotlink_protection) {{
    @hotlink {{
        not header_regexp Referer "{regex_str}"
        path {exts}
    }}
    respond @hotlink 403
}}
"""
        if os.path.isabs(HOTLINK_CADDY_FILE):
             os.makedirs(os.path.dirname(HOTLINK_CADDY_FILE), exist_ok=True)

        with open(HOTLINK_CADDY_FILE, "w") as f:
            f.write(caddy_conf)

        restart_caddy()
        return {"status": "success", "message": "Hotlink configuration saved and applied."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_custom_rules():
    if os.path.exists(CUSTOM_RULES_FILE):
        with open(CUSTOM_RULES_FILE, "r") as f:
            return {"content": f.read()}
    return {"content": "# Custom ModSecurity Rules\n# Add your custom rules here...\n"}

def save_custom_rules(content: str):
    try:
        if os.path.isabs(CUSTOM_RULES_FILE):
            os.makedirs(os.path.dirname(CUSTOM_RULES_FILE), exist_ok=True)
        with open(CUSTOM_RULES_FILE, "w") as f:
            f.write(content)
        restart_caddy()
        return {"status": "success", "message": "Custom rules saved and applied."}
    except Exception as e:
         return {"status": "error", "message": f"Failed to save rules: {str(e)}"}

def clear_cache():
    try:
        if os.name == 'nt':
            time.sleep(1)
            return {"status": "success", "message": "Cache cleared successfully (Simulation)"}
        else:
            # Command hapus cache (opsional untuk caddy, tapi biasanya stateless kecuali configured)
            # Caddy admin API bisa dipakai untuk wipe cache jika ada
            # Disini kita skip atau restart caddy saja
            restart_caddy()
            return {"status": "success", "message": "Caddy reloaded (cache cleared if applicable)"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to clear cache: {str(e)}"}

def manage_service(service_name: str, action: str):
    # Mapping nama service di Dashboard vs nama service asli di Linux
    ALLOWED_SERVICES = ["caddy", "ssh", "postgresql", "fail2ban", "modsec_crs", "crs"]
    SERVICE_MAP = {
        "ssh": "sshd", 
        "caddy": "caddy",
        "postgresql": "postgresql",
        "fail2ban": "fail2ban",
        "modsec_crs": "caddy",  # Coraza runs inside Caddy
        "crs": "caddy"
    }

    if service_name not in ALLOWED_SERVICES:
        return {"status": "error", "message": f"Service '{service_name}' is not managed by this panel."}
    
    sys_name = SERVICE_MAP.get(service_name, service_name)

    if action not in ["start", "stop", "restart"]:
        return {"status": "error", "message": "Invalid action."}

    try:
        if os.name == 'nt':
            time.sleep(1)
            return {"status": "success", "message": f"[DEV] Service {sys_name} {action}ed."}
        else:
            cmd = ["sudo", "/usr/bin/systemctl", action, sys_name]
            subprocess.run(cmd, check=True)
            return {"status": "success", "message": f"Service {sys_name} {action}ed successfully."}
            
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"Failed to {action} {sys_name}: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_services_status():
    # Service yang mau dimonitor
    target_services = [
        {"name": "caddy", "label": "Caddy Web Server"},
        {"name": "modsec_crs", "label": "Protection Rules (OWASP CRS)"},
        {"name": "sshd", "label": "SSH Service"}
    ]
    
    results = []
    
    # Windows Fallback
    if os.name == 'nt':
        return [
            {"id": "caddy", "name": "Caddy Web Server", "status": "Active", "pid": "1024", "cpu": "1.2%", "uptime": "14d"},
            {"id": "crs", "name": "Protection Rules (OWASP CRS)", "status": "Active", "pid": "-", "cpu": "-", "uptime": "14d"},
            {"id": "ssh", "name": "SSH Service", "status": "Active", "pid": "892", "cpu": "0.1%", "uptime": "45d"},
        ]

    for svc in target_services:
        s_name = svc["name"]
        
        # Logika khusus untuk CRS (karena dia bukan service beneran, tapi nempel di Caddy)
        if s_name == "modsec_crs":
             item = {
                "id": "crs",
                "name": svc["label"],
                "status": "Active",
                "pid": "-", "cpu": "-", "uptime": "-"
             }
             # Cek apakah caddy aktif
             res = subprocess.run(["systemctl", "is-active", "caddy"], capture_output=True, text=True)
             if res.returncode != 0:
                 item["status"] = "Inactive"
             
             results.append(item)
             continue

        # Logic standard untuk service systemd (caddy, sshd)
        real_svc_name = "sshd" if s_name == "sshd" else s_name
        
        item = {
            "id": svc["name"],
            "name": svc["label"],
            "status": "Inactive",
            "pid": "-",
            "cpu": "0%",
            "uptime": "-"
        }
        
        try:
            # 1. Cek Status
            res = subprocess.run(["systemctl", "is-active", real_svc_name], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip() == "active":
                item["status"] = "Active"
                
                # 2. Ambil PID
                res_pid = subprocess.run(["systemctl", "show", "--property", "MainPID", "--value", real_svc_name], capture_output=True, text=True)
                pid_str = res_pid.stdout.strip()
                
                if pid_str and pid_str != "0":
                    pid = str(pid_str)
                    item["pid"] = pid
                    try:
                        # 3. Ambil CPU & Uptime via PSUTIL
                        p = psutil.Process(int(pid_str))
                        item["cpu"] = f"{p.cpu_percent(interval=0.1)}%" # Interval kecil agar tidak blocking
                        
                        create_time = datetime.fromtimestamp(p.create_time())
                        uptime_duration = datetime.now() - create_time
                        
                        days = uptime_duration.days
                        hours = uptime_duration.seconds // 3600
                        item["uptime"] = f"{days}d {hours}h"
                    except:
                        pass
            elif res.stdout.strip() == "failed":
                item["status"] = "Failed"
            else:
                 item["status"] = "Stopped"
                 
        except Exception:
            item["status"] = "Unknown"
            
        results.append(item)
        
    return results

def get_system_health():
    """Mengambil data real hardware menggunakan psutil"""
    if os.name == 'nt':
        # Data dummy untuk Windows (karena loadavg ga ada di windows)
        return {
            "uptime": "DEV MODE",
            "ram_usage": {"used": 8, "total": 16, "percent": 50},
            "cpu_usage": 15,
            "disk_usage": {"used_percent": 45, "path": "C:/"},
            "load_avg": 0.5,
            "network": {"in": 100, "out": 200},
            "services": get_services_status()
        }

    # 1. Memory
    mem = psutil.virtual_memory()
    ram_gb = round(mem.total / (1024**3), 2)
    used_gb = round(mem.used / (1024**3), 2)
    
    # 2. CPU
    cpu_usage = psutil.cpu_percent(interval=0.5)
    
    # 3. Disk
    disk = psutil.disk_usage('/')
    
    # 4. Load Average (1 menit)
    try:
        load_avg = os.getloadavg()[0]
    except:
        load_avg = 0
        
    # 5. Uptime
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime_sec = datetime.now() - boot_time
    uptime_str = f"{uptime_sec.days}d {uptime_sec.seconds // 3600}h"
    
    # 6. Network
    net = psutil.net_io_counters()
    # Konversi ke KB untuk display
    net_in = round(net.bytes_recv / 1024, 2)
    net_out = round(net.bytes_sent / 1024, 2)
    
    services = get_services_status()
    
    return {
        "uptime": uptime_str,
        "ram_usage": {
            "used": used_gb, 
            "total": ram_gb, 
            "percent": mem.percent
        },
        "cpu_usage": cpu_usage,
        "disk_usage": {"used_percent": disk.percent, "path": "/"},
        "load_avg": round(load_avg, 2),
        "network": {"in": net_in, "out": net_out},
        "services": services
    }

def factory_reset():
    """Wipes all data and resets to default state"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Truncate Tables
            cursor.execute("DELETE FROM ip_rules")
            cursor.execute("DELETE FROM waf_rule_toggles")
            cursor.execute("DELETE FROM settings")
            cursor.execute("DELETE FROM users")

            # 2. Restore Default Admin (admin/admin123)
            default_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" 
            cursor.execute(
                "INSERT INTO users (username, full_name, hashed_password) VALUES (?, ?, ?)",
                ("admin", "Administrator", default_hash)
            )
            
            conn.commit()

        # 3. Reset Files
        sync_ip_rules_file()
        sync_exclusions_file()
        
        default_hotlink = {
            "extensions": ["jpg", "jpeg", "png", "gif", "ico", "webp"],
            "domains": ["google.com", "bing.com", "yahoo.com"]
        }
        save_hotlink_config(default_hotlink)
        
        save_custom_rules("# Custom ModSecurity Rules\n# Add your custom rules here...\n")
        
        # 4. Restart System
        restart_caddy()
        
        return {"status": "success", "message": "Factory reset complete."}
        
    except Exception as e:
        return {"status": "error", "message": f"Factory reset failed: {str(e)}"}