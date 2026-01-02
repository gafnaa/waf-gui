import subprocess
import random
import os
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