import subprocess
import random
import os
from app.core.config import get_settings

settings = get_settings()

# Simulasi database rule (Di production ini mapping ke ID OWASP CRS)
WAF_RULES_DB = [
    {"id": "941100", "name": "XSS Protection", "desc": "Block Cross Site Scripting attacks", "category": "Injection", "enabled": True},
    {"id": "942100", "name": "SQL Injection", "desc": "Block SQL Injection attempts", "category": "Injection", "enabled": True},
    {"id": "933100", "name": "PHP Injection", "desc": "Block PHP code injection", "category": "Injection", "enabled": True},
    {"id": "920350", "name": "Host Header Attack", "desc": "Validate Host header format", "category": "Protocol", "enabled": True},
    {"id": "913100", "name": "Scanner Detection", "desc": "Block malicious scanners (Nessus, etc)", "category": "Bot", "enabled": True},
]

# File khusus untuk menyimpan rule yang dimatikan (Exclusions)
EXCLUSION_FILE = "/etc/nginx/modsec/waf-exclusions.conf"

def restart_nginx():
    """Reload Nginx safely via sudo"""
    try:
        subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "nginx"], check=True)
        return {"status": "success", "message": "Nginx reloaded successfully"}
    except subprocess.CalledProcessError as e:
        # Fallback untuk mode development di Windows/Mac (agar tidak error 500)
        return {"status": "warning", "message": f"Simulated Reload (Dev Mode): {str(e)}"}

def add_waf_rule(ip_address: str, action: str):
    # ... (Kode lama tetap sama) ...
    # Simpan kode lama add_waf_rule Anda di sini
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
                # Jika ada 'SecRuleRemoveById 941100', berarti rule itu MATI
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

        # 3. Tulis ulang file (membutuhkan sudo tee)
        # Gabungkan lines jadi satu string
        content_str = "".join(new_lines)
        
        # Tulis via subprocess sudo
        cmd = f"echo '{content_str}' | sudo tee {EXCLUSION_FILE}"
        subprocess.run(cmd, shell=True, check=True)
        
        restart_nginx()
        status_msg = "Enabled" if enable else "Disabled"
        return {"status": "success", "message": f"Rule {rule['name']} is now {status_msg}"}

    except Exception as e:
        return {"status": "error", "message": str(e)}