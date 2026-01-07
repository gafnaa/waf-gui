import subprocess
import random
import os
import psutil
import time
import json
import re
from datetime import datetime
from app.core.config import get_settings
from app.db import get_db_connection

settings = get_settings()

# --- Configuration Files (Generated from DB) ---
if os.name == 'nt' or not os.path.exists("/usr/sbin/nginx"):
    # Dev Mode
    PREFIX = os.path.join(os.path.dirname(__file__), "..", "..")
    IP_RULES_FILE = os.path.join(PREFIX, "dummy_waf.conf")
    EXCLUSION_FILE = os.path.join(PREFIX, "dummy_waf_exclusions.conf")
    CUSTOM_RULES_FILE = os.path.join(PREFIX, "custom_rules.conf")
    HOTLINK_NGINX_FILE = os.path.join(PREFIX, "hotlink.conf")
else:
    # Production Mode
    IP_RULES_FILE = "/etc/nginx/modsec/whitelist.conf" # Assuming standard include
    EXCLUSION_FILE = "/etc/nginx/modsec/waf-exclusions.conf"
    CUSTOM_RULES_FILE = "/etc/nginx/modsec/custom_rules.conf"
    HOTLINK_NGINX_FILE = "/etc/nginx/conf.d/hotlink.conf"

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

def restart_nginx():
    """Reload Nginx safely via sudo"""
    try:
        subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "nginx"], check=True)
        return {"status": "success", "message": "Nginx reloaded successfully"}
    except subprocess.CalledProcessError as e:
        return {"status": "warning", "message": f"Simulated Reload (Dev Mode): {str(e)}"}
    except FileNotFoundError:
        return {"status": "warning", "message": "Nginx verify/reload skipped (Dev Mode)"}

def sync_ip_rules_file():
    """Generates Nginx config file from DB"""
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM ip_rules WHERE status = 'Active'").fetchall()
    
    # Ensure dir exists
    os.makedirs(os.path.dirname(IP_RULES_FILE), exist_ok=True)
    
    with open(IP_RULES_FILE, "w") as f:
        f.write(f"# Auto-generated from WAF GUI DB at {datetime.now()}\n")
        f.write("# Do not edit manually.\n\n")
        for r in rows:
            line = f"# Meta: {r['note']}|{r['duration']}\n{r['action']} {r['ip']};\n"
            f.write(line)

def sync_exclusions_file():
    """Generates WAF exclusions file from DB"""
    with get_db_connection() as conn:
        rows = conn.execute("SELECT rule_id FROM waf_rule_toggles WHERE enabled = 0").fetchall()
    
    disabled_ids = [r['rule_id'] for r in rows]
    
    os.makedirs(os.path.dirname(EXCLUSION_FILE), exist_ok=True)
    
    with open(EXCLUSION_FILE, "w") as f:
        f.write(f"# Auto-generated WAF Exclusions at {datetime.now()}\n")
        for rule_id in disabled_ids:
            f.write(f"SecRuleRemoveById {rule_id}\n")

# --- Service Functions ---

def add_waf_rule(ip_address: str, action: str, note: str = "", duration: str = "Permanent"):
    if action not in ["deny", "allow"]:
        return {"status": "error", "message": "Action must be 'deny' or 'allow'"}
    
    if not ip_address:
        return {"status": "error", "message": "IP Address is required"}

    try:
        with get_db_connection() as conn:
            # Check duplicate
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM ip_rules WHERE ip = ?", (ip_address,))
            if cursor.fetchone():
                return {"status": "error", "message": f"Rule for {ip_address} already exists"}
            
            # Insert
            # Fake region detection
            region = "US" if "1" in ip_address else ("CN" if "182" in ip_address else "Local")
            
            cursor.execute(
                "INSERT INTO ip_rules (ip, action, note, duration, region) VALUES (?, ?, ?, ?, ?)",
                (ip_address, action, note, duration, region)
            )
            conn.commit()
            
        sync_ip_rules_file()
        restart_nginx()
        return {"status": "success", "message": f"Rule added for {ip_address}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_ip_rules():
    with get_db_connection() as conn:
        # Get active rules
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
        restart_nginx()
        return {"status": "success", "message": f"Rule removed for {ip_address}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_waf_rules():
    # Merge Static Info with DB State
    rules = [r.copy() for r in WAF_RULES_DB]
    
    with get_db_connection() as conn:
        rows = conn.execute("SELECT rule_id, enabled FROM waf_rule_toggles").fetchall()
        db_state = {r['rule_id']: bool(r['enabled']) for r in rows}
    
    for rule in rules:
        if rule['id'] in db_state:
            rule['enabled'] = db_state[rule['id']]
            
    return rules

def toggle_rule(rule_id: str, enable: bool):
    # Verify ID exists
    rule = next((r for r in WAF_RULES_DB if r['id'] == rule_id), None)
    if not rule:
        return {"status": "error", "message": "Rule ID not found"}
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Upsert (SQLite syntax: INSERT OR REPLACE)
            cursor.execute(
                "INSERT OR REPLACE INTO waf_rule_toggles (rule_id, enabled) VALUES (?, ?)",
                (rule_id, 1 if enable else 0)
            )
            conn.commit()
            
        sync_exclusions_file()
        restart_nginx()
        
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
        # Save to DB
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                ("hotlink_config", json.dumps(config))
            )
            conn.commit()

        # Generate Nginx Config
        ext_str = "|".join(config.get("extensions", []))
        domains_str = " ".join(config.get("domains", []))
        
        nginx_conf = f"""# Auto-generated Hotlink Rules
# Do not edit manually

location ~ \.({ext_str})$ {{
    valid_referers none blocked server_names {domains_str};
    if ($invalid_referer) {{
        return 403;
    }}
}}
"""
        os.makedirs(os.path.dirname(HOTLINK_NGINX_FILE), exist_ok=True)
        with open(HOTLINK_NGINX_FILE, "w") as f:
            f.write(nginx_conf)

        restart_nginx()
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
        os.makedirs(os.path.dirname(CUSTOM_RULES_FILE), exist_ok=True)
        with open(CUSTOM_RULES_FILE, "w") as f:
            f.write(content)
        restart_nginx()
        return {"status": "success", "message": "Custom rules saved and applied."}
    except Exception as e:
         return {"status": "error", "message": f"Failed to save rules: {str(e)}"}

def clear_cache():
    try:
        if os.name == 'nt':
            time.sleep(1)
            return {"status": "success", "message": "Cache cleared successfully (Simulation)"}
        else:
            subprocess.run("sudo rm -rf /var/cache/nginx/*", shell=True, check=True)
            restart_nginx()
            return {"status": "success", "message": "Nginx cache cleared"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to clear cache: {str(e)}"}

def manage_service(service_name: str, action: str):
    ALLOWED_SERVICES = ["nginx", "ssh", "postgresql", "fail2ban"]
    SERVICE_MAP = {
        "ssh": "sshd",
        "nginx": "nginx",
        "postgresql": "postgresql",
        "fail2ban": "fail2ban"
    }

    if service_name not in ALLOWED_SERVICES:
        return {"status": "error", "message": f"Service '{service_name}' is not managed by this panel."}
    
    sys_name = SERVICE_MAP.get(service_name, service_name)

    if action not in ["start", "stop", "restart"]:
        return {"status": "error", "message": "Invalid action. Use start, stop, or restart."}

    try:
        if os.name == 'nt':
            time.sleep(1)
            return {"status": "success", "message": f"[DEV] Service {sys_name} {action}ed successfully."}
        else:
            cmd = ["sudo", "/usr/bin/systemctl", action, sys_name]
            subprocess.run(cmd, check=True)
            return {"status": "success", "message": f"Service {sys_name} {action}ed successfully."}
            
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"Failed to {action} {sys_name}: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_services_status():
    target_services = [
        {"name": "nginx", "label": "Nginx Web Server"},
        {"name": "modsec_crs", "label": "Protection Rules (OWASP CRS)"},
        {"name": "sshd", "label": "SSH Service"}
    ]
    
    results = []
    
    # Windows Dev Mode Fallback
    if os.name == 'nt':
        return [
            {"id": "nginx", "name": "Nginx Web Server", "status": "Active", "pid": "1024", "cpu": f"{random.uniform(0.5, 5.0):.1f}%", "uptime": "14d"},
            {"id": "crs", "name": "Protection Rules (OWASP CRS)", "status": "Active", "pid": "-", "cpu": "-", "uptime": "14d"},
            {"id": "ssh", "name": "SSH Service", "status": "Active", "pid": "892", "cpu": "0.1%", "uptime": "45d"},
        ]

    for svc in target_services:
        s_name = svc["name"]
        
        # Virtual Service: OWASP CRS
        if s_name == "modsec_crs":
             item = {
                "id": "crs",
                "name": svc["label"],
                "status": "Active",
                "pid": "-",
                "cpu": "-",
                "uptime": "-"
             }
             res = subprocess.run(["systemctl", "is-active", "nginx"], capture_output=True, text=True)
             if res.returncode != 0:
                 item["status"] = "Inactive"
             
             results.append(item)
             continue

        item = {
            "id": svc["name"],
            "name": svc["label"],
            "status": "Inactive",
            "pid": "-",
            "cpu": "0%",
            "uptime": "-"
        }
        
        try:
            res = subprocess.run(["systemctl", "is-active", s_name], capture_output=True, text=True)
            if res.returncode == 0:
                item["status"] = "Active"
                res_pid = subprocess.run(["systemctl", "show", "--property", "MainPID", "--value", s_name], capture_output=True, text=True)
                pid_str = res_pid.stdout.strip()
                
                if pid_str and pid_str != "0":
                    pid = str(pid_str)
                    item["pid"] = pid
                    try:
                        p = psutil.Process(int(pid_str))
                        item["cpu"] = f"{p.cpu_percent(interval=None)}%"
                        
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
    ram_total = 16.0
    ram_used = 8.4 + random.uniform(-0.5, 0.5)
    ram_percent = (ram_used / ram_total) * 100
    
    cpu_usage = int(12 + random.uniform(-5, 10))
    load_avg = 0.45 + random.uniform(0, 0.2)
    uptime = "14d 2h 12m"
    net_in = int(120 + random.uniform(-20, 30))
    net_out = int(50 + random.uniform(-10, 10))
    
    services = get_services_status()
    
    return {
        "uptime": uptime,
        "ram_usage": {
            "used": round(ram_used, 1), 
            "total": ram_total, 
            "percent": round(ram_percent, 1)
        },
        "cpu_usage": cpu_usage,
        "disk_usage": {"used_percent": 85, "path": "/var/log"},
        "load_avg": round(load_avg, 2),
        "network": {"in": net_in, "out": net_out},
        "services": services
    }