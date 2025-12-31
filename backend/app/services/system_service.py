import subprocess
import random
from app.core.config import get_settings

settings = get_settings()

def restart_nginx():
    """Reload Nginx safely via sudo"""
    try:
        subprocess.run(["sudo", "/usr/bin/systemctl", "reload", "nginx"], check=True)
        return {"status": "success", "message": "Nginx reloaded successfully"}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"Reload failed: {str(e)}"}

def add_waf_rule(ip_address: str, action: str):
    """Menulis rule ModSecurity ke file config"""
    # Generate ID unik untuk rule ModSec (range aman user: 100000+)
    rule_id = random.randint(100000, 999999)
    
    if action == "deny":
        # Rule: Drop koneksi dari IP ini
        rule_content = (
            f'SecRule REMOTE_ADDR "@ipMatch {ip_address}" '
            f'"id:{rule_id},phase:1,deny,log,msg:\'Blocked by Admin Dashboard\'"\\n'
        )
    else:
        # Rule: Whitelist (Skip WAF check)
        rule_content = (
            f'SecRule REMOTE_ADDR "@ipMatch {ip_address}" '
            f'"id:{rule_id},phase:1,pass,nolog,ctl:ruleEngine=Off"\\n'
        )

    try:
        # Menggunakan 'tee -a' untuk append file dengan sudo
        command = f"echo '{rule_content}' | sudo /usr/bin/tee -a {settings.WAF_CONFIG_PATH}"
        subprocess.run(command, shell=True, check=True)
        
        # Auto reload agar efeknya langsung terasa
        restart_nginx()
        
        return {"status": "success", "message": f"IP {ip_address} rule added & Nginx reloaded"}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"Failed to write config: {str(e)}"}