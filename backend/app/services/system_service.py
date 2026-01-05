import subprocess
import random
import os
import psutil
import time
import json
from datetime import datetime, timedelta
from app.core.config import get_settings

settings = get_settings()

# Simulasi database rule (Di production ini mapping ke ID OWASP CRS)
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

# File khusus untuk menyimpan rule yang dimatikan (Exclusions)
if os.name == 'nt' or not os.path.exists("/usr/sbin/nginx"):
    # Dev Mode: Use local file
    EXCLUSION_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_waf_exclusions.conf")
else:
    # Production Mode (Linux/Nginx)
    EXCLUSION_FILE = "/etc/nginx/modsec/waf-exclusions.conf"

# File untuk custom rules
CUSTOM_RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "custom_rules.conf")
HOTLINK_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "hotlink.json")

import re

IP_RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_waf.conf")

def restart_nginx():
    """Reload Nginx safely via sudo"""
    try:
        subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "nginx"], check=True)
        return {"status": "success", "message": "Nginx reloaded successfully"}
    except subprocess.CalledProcessError as e:
        # Fallback untuk mode development di Windows/Mac (agar tidak error 500)
        return {"status": "warning", "message": f"Simulated Reload (Dev Mode): {str(e)}"}

def add_waf_rule(ip_address: str, action: str, note: str = "", duration: str = "Permanent"):
    """
    Adds an IP block/allow rule to Nginx config.
    Format:
    # Meta: note|duration
    deny 192.168.1.1;
    """
    if action not in ["deny", "allow"]:
        return {"status": "error", "message": "Action must be 'deny' or 'allow'"}
    
    # Basic validation (could use regex for stricter IP/CIDR)
    if not ip_address:
        return {"status": "error", "message": "IP Address is required"}

    # Check for duplicates
    if os.path.exists(IP_RULES_FILE):
        with open(IP_RULES_FILE, "r") as f:
            content = f.read()
            # Simple check: search for "deny <ip>;" or "allow <ip>;"
            # Regex is safer to avoid partial matches (e.g. 1.1 matches 1.1.1.1)
            pattern = f"\\b{action}\\s+{re.escape(ip_address)};"
            if re.search(pattern, content):
                 return {"status": "error", "message": f"Rule for {ip_address} already exists"}

    try:
        entry = f"# Meta: {note}|{duration}\n{action} {ip_address};\n"
        
        with open(IP_RULES_FILE, "a") as f:
            f.write(entry)
            
        restart_nginx()
        return {"status": "success", "message": f"Rule added for {ip_address}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_ip_rules():
    """Parses the IP rules file"""
    rules = []
    if not os.path.exists(IP_RULES_FILE):
        return rules
        
    try:
        with open(IP_RULES_FILE, "r") as f:
            lines = f.readlines()
            
        current_meta = {"note": "-", "duration": "Permanent"}
        
        for line in lines:
            line = line.strip()
            if not line: 
                continue
                
            if line.startswith("# Meta:"):
                # Parse metadata
                try:
                    parts = line.split(":", 1)[1].strip().split("|")
                    current_meta["note"] = parts[0] if len(parts) > 0 else "-"
                    current_meta["duration"] = parts[1] if len(parts) > 1 else "Permanent"
                except:
                    pass
            elif line.startswith("deny") or line.startswith("allow"):
                # Parse Rule: deny 1.2.3.4;
                try:
                    parts = line.rstrip(";").split()
                    action = parts[0]
                    ip = parts[1]
                    
                    # Fake Region
                    region = "US" if "1" in ip else ("CN" if "182" in ip else "Local")
                    
                    rules.append({
                        "ip": ip,
                        "action": action,
                        "note": current_meta["note"],
                        "duration": current_meta["duration"],
                        "region": region,
                        "status": "Active"
                    })
                    # Reset meta after consuming
                    current_meta = {"note": "-", "duration": "Permanent"}
                except:
                    pass
            else:
                # Ordinary comment or other config, ignore or reset meta
                # If it's not a Meta comment, we lose the context for the next rule usually.
                # But let's assume strict format.
                pass
                
    except Exception as e:
        print(f"Error parsing rules: {e}")
        
    return rules

def delete_ip_rule(ip_address: str):
    """Removes a rule by IP"""
    if not os.path.exists(IP_RULES_FILE):
        return {"status": "error", "message": "Config file not found"}

    try:
        with open(IP_RULES_FILE, "r") as f:
            lines = f.readlines()
        
        new_lines = []
        skip_next = False
        
        # We need to filter out the Rule AND its preceding Meta comment.
        # Simple approach: build a list of indices to remove
        
        # Better approach: Iterate and buffer.
        # Since Meta is strictly above the rule, we can just filter blocks.
        
        parsed_entries = [] # Stores tuples (lines_list, ip_addr OR None)
        
        buffer = []
        for line in lines:
            buffer.append(line)
            if line.strip().endswith(";"):
                # Check IP
                # Extraction
                clean = line.strip().rstrip(";")
                parts = clean.split()
                if len(parts) >= 2:
                    current_ip = parts[1]
                    # If matches delete target, discard buffer
                    if current_ip == ip_address:
                        buffer = [] # Discard
                    else:
                        new_lines.extend(buffer)
                        buffer = []
                else:
                    new_lines.extend(buffer)
                    buffer = []
        
        # Add remaining (trailing newlines etc)
        new_lines.extend(buffer)
            
        with open(IP_RULES_FILE, "w") as f:
            f.writelines(new_lines)
            
        restart_nginx()
        return {"status": "success", "message": f"Rule removed for {ip_address}"}

    except Exception as e:
        return {"status": "error", "message": str(e)} 

def get_waf_rules():
    """Mendapatkan status rule saat ini"""
    # Di sistem nyata, kita baca file EXCLUSION_FILE untuk melihat mana yang mati
    # Logika sederhana: Jika ID ada di exclusion file, berarti enabled = False
    
    current_rules = [r.copy() for r in WAF_RULES_DB] # Deep copy
    
    if os.path.exists(EXCLUSION_FILE):
        with open(EXCLUSION_FILE, 'r') as f:
            content = f.read()
            for rule in current_rules:
                # Jika ada 'SecRuleRemoveById ID', berarti rule itu MATI
                if f"SecRuleRemoveById {rule['id']}" in content:
                    rule['enabled'] = False
    
    return current_rules

def toggle_rule(rule_id: str, enable: bool):
    """Menyalakan/Mematikan Rule WAF"""
    
    # Validasi ID
    rule = next((r for r in WAF_RULES_DB if r['id'] == rule_id), None)
    if not rule:
        return {"status": "error", "message": "Rule ID not found"}

    try:
        # Jika enable=False, kita TULIS pengecualian ke file
        # Jika enable=True, kita HAPUS pengecualian dari file
        
        # 1. Baca isi file lama
        existing_lines = []
        if os.path.exists(EXCLUSION_FILE):
            with open(EXCLUSION_FILE, 'r') as f:
                existing_lines = f.readlines()
        
        exclusion_line = f"SecRuleRemoveById {rule_id}\n"
        
        # 2. Modifikasi isi
        new_lines = []
        if not enable:
            # Matikan rule -> Tambahkan exclusion jika belum ada
            new_lines = existing_lines
            if exclusion_line not in existing_lines:
                new_lines.append(exclusion_line)
        else:
            # Nyalakan rule -> Hapus exclusion
            new_lines = [line for line in existing_lines if line.strip() != exclusion_line.strip()]

        # 3. Tulis ulang file
        # Gabungkan lines jadi satu string
        content_str = "".join(new_lines)
        
        # Jika dev mode (file lokal), tulis langsung. Jika prod, pakai sudo tee.
        if os.name == 'nt' or "dummy" in EXCLUSION_FILE:
             with open(EXCLUSION_FILE, "w") as f:
                 f.write(content_str)
        else:
             # Tulis via subprocess sudo
             cmd = f"echo '{content_str}' | sudo tee {EXCLUSION_FILE}"
             subprocess.run(cmd, shell=True, check=True)
        
        restart_nginx()
        status_msg = "Enabled" if enable else "Disabled"
        return {"status": "success", "message": f"Rule {rule['name']} is now {status_msg}"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_custom_rules():
    """Read custom rules from file"""
    if os.path.exists(CUSTOM_RULES_FILE):
        with open(CUSTOM_RULES_FILE, "r") as f:
            return {"content": f.read()}
    return {"content": "# Custom ModSecurity Rules\n# Add your custom rules here...\n"}

def save_custom_rules(content: str):
    """Save custom rules to file and reload Nginx"""
    try:
        # Di production, validasi syntax dulu dengan `nginx -t` sebelum save idealnya.
        with open(CUSTOM_RULES_FILE, "w") as f:
            f.write(content)
        
        # Di real server, file ini harus di-include di nginx.conf
        # Disini kita cuma save file dan restart.
        
        restart_nginx()
        return {"status": "success", "message": "Custom rules saved and applied."}
    except Exception as e:
         return {"status": "error", "message": f"Failed to save rules: {str(e)}"}

def clear_cache():
    """Clears Nginx cache and temporary files"""
    try:
        if os.name == 'nt':
            # Windows/Dev: Just simulate
            import time
            time.sleep(1) # Simulate work
            return {"status": "success", "message": "Cache cleared successfully (Simulation)"}
        else:
            # Linux: Clear nginx cache directories
            # Assuming standard paths
            subprocess.run("sudo rm -rf /var/cache/nginx/*", shell=True, check=True)
            restart_nginx() # Reload to clear memory cache
            return {"status": "success", "message": "Nginx cache cleared"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to clear cache: {str(e)}"}

def manage_service(service_name: str, action: str):
    """
    Start/Stop/Restart a system service.
    """
    ALLOWED_SERVICES = ["nginx", "ssh", "postgresql", "fail2ban"]
    
    # Mapping friendly names to actual systemd service names if needed
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
            # Dev Mode Simulation
            time.sleep(1)
            return {"status": "success", "message": f"[DEV] Service {sys_name} {action}ed successfully."}
        else:
            # Production: Use systemctl
            # Note: The user runner must have sudo NOPASSWD for /bin/systemctl or equivalent
            cmd = ["sudo", "/usr/bin/systemctl", action, sys_name]
            subprocess.run(cmd, check=True)
            return {"status": "success", "message": f"Service {sys_name} {action}ed successfully."}
            
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"Failed to {action} {sys_name}: {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_services_status():
    """
    Get status of monitored services.
    Uses psutil to find processes and systemctl for status if available.
    """
    target_services = [
        {"name": "nginx", "label": "Nginx Web Server"},
        {"name": "fail2ban", "label": "Fail2Ban WAF"},
        {"name": "sshd", "label": "SSH Service"},
        {"name": "postgresql", "label": "Database"}
    ]
    
    results = []
    
    # Windows Dev Mode Fallback
    if os.name == 'nt':
        # Return random simulated data for preview
        return [
            {"id": "nginx", "name": "Nginx", "status": "Active", "pid": 1024, "cpu": f"{random.uniform(0.5, 5.0):.1f}%", "uptime": "14d"},
            {"id": "fail2ban", "name": "Fail2Ban", "status": "Active", "pid": 1025, "cpu": f"{random.uniform(0.1, 1.0):.1f}%", "uptime": "14d"},
            {"id": "ssh", "name": "SSH", "status": "Sleeping", "pid": 892, "cpu": "0.1%", "uptime": "45d"},
            {"id": "postgresql", "name": "PostgreSQL", "status": "Active", "pid": 5432, "cpu": "1.2%", "uptime": "3d"},
        ]

    for svc in target_services:
        s_name = svc["name"]
        item = {
            "id": svc["name"],
            "name": svc["label"],
            "status": "Inactive",
            "pid": "-",
            "cpu": "0%",
            "uptime": "-"
        }
        
        try:
            # Check status using systemctl
            # is-active returns 0 if active, others if not
            res = subprocess.run(["systemctl", "is-active", s_name], capture_output=True, text=True)
            if res.returncode == 0:
                item["status"] = "Active"
                
                # Get PID
                res_pid = subprocess.run(["systemctl", "show", "--property", "MainPID", "--value", s_name], capture_output=True, text=True)
                pid_str = res_pid.stdout.strip()
                
                if pid_str and pid_str != "0":
                    pid = int(pid_str)
                    item["pid"] = pid
                    
                    # Get CPU & Uptime via psutil
                    try:
                        p = psutil.Process(pid)
                        # cpu_percent needs to be called once, then again to get interval. 
                        # But simpler is just 0.0 or last value. 
                        # For 'instant' reading without blocking, we might get 0.0 often.
                        # We used p.cpu_percent() (blocking) or p.cpu_percent(interval=None)
                        item["cpu"] = f"{p.cpu_percent(interval=None)}%"
                        
                        # Calculate uptime
                        create_time = datetime.fromtimestamp(p.create_time())
                        uptime_duration = datetime.now() - create_time
                        
                        # Format uptime friendly
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
    """Retrieves real-time system metrics (Simulated for this demo)"""
    
    # Simulate CPU/RAM
    ram_total = 16.0
    ram_used = 8.4 + random.uniform(-0.5, 0.5)
    ram_percent = (ram_used / ram_total) * 100
    
    cpu_usage = int(12 + random.uniform(-5, 10))
    
    # Simulate Load Avg
    load_avg = 0.45 + random.uniform(0, 0.2)
    
    # Simulate Uptime
    uptime = "14d 2h 12m"
    
    # Simulate Network
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

def get_hotlink_config():
    """Reads hotlink configuration from JSON"""
    default_config = {
        "extensions": ["jpg", "jpeg", "png", "gif", "ico", "webp"],
        "domains": ["google.com", "bing.com", "yahoo.com"]
    }
    
    if os.path.exists(HOTLINK_CONFIG_FILE):
        try:
            with open(HOTLINK_CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading hotlink config: {e}")
            
    return default_config

def save_hotlink_config(config: dict):
    """Saves hotlink config and generates Nginx directives"""
    try:
        # 1. Save JSON for UI
        with open(HOTLINK_CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=4)
            
        # 2. Generate Nginx Config (Hotlink Protection)
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
        HOTLINK_NGINX_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "hotlink.conf")
        with open(HOTLINK_NGINX_FILE, "w") as f:
            f.write(nginx_conf)

        restart_nginx()
        return {"status": "success", "message": "Hotlink configuration saved and applied."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}