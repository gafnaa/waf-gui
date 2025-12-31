import os
from app.core.config import get_settings

settings = get_settings()

def analyze_logs():
    if not os.path.exists(settings.ACCESS_LOG_PATH):
        return {
            "total_requests": 0,
            "blocked_attacks": 0,
            "cache_hit_rate": 0.0,
            "status": "Log file not found"
        }

    total_req = 0
    blocked = 0
    cache_hits = 0

    try:
        # Membaca 1000 baris terakhir untuk efisiensi
        with open(settings.ACCESS_LOG_PATH, "r") as f:
            # Teknik membaca file besar dengan efisien (tail)
            lines = f.readlines()[-1000:]
            
            for line in lines:
                total_req += 1
                # Asumsi status code 403 adalah blokiran WAF
                if ' "403" ' in line or ' 403 ' in line:
                    blocked += 1
                # Asumsi Log format mencatat status cache (HIT/MISS)
                if 'HIT' in line:
                    cache_hits += 1
        
        hit_rate = (cache_hits / total_req * 100) if total_req > 0 else 0

        return {
            "total_requests": total_req,
            "blocked_attacks": blocked,
            "cache_hit_rate": round(hit_rate, 2),
            "status": "active"
        }
    except PermissionError:
        return {
            "total_requests": 0, 
            "blocked_attacks": 0, 
            "cache_hit_rate": 0, 
            "status": "Permission Denied"
        }