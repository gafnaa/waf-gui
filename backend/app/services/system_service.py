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

def restart_nginx():
    """Reload Nginx safely via sudo"""
    try:
        subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "nginx"], check=True)
        return {"status": "success", "message": "Nginx reloaded successfully"}
    except subprocess.CalledProcessError as e:
        # Fallback untuk mode development di Windows/Mac (agar tidak error 500)
        return {"status": "warning", "message": f"Simulated Reload (Dev Mode): {str(e)}"}

def add_waf_rule(ip_address: str, action: str):
    # Placeholder for older function if needed
    pass 

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