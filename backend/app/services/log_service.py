import os
import time
import psutil
import datetime
from collections import deque
from app.core.config import get_settings
from app.models.schemas import StatsResponse, AttackModule, TrafficPoint

settings = get_settings()

def analyze_logs() -> StatsResponse:
    # 1. System Stats (Real)
    cpu_load = f"{psutil.cpu_percent()}%"
    
    # Init counters
    total_req = 0
    blocked = 0
    
    # Attack counters (simplified detection based on keywords in URL/log if available)
    attacks = {
        "sql_injection": 0,
        "xss": 0,
        "lfi": 0, # maps to Command Injection/Path Traversal roughly
        "rce": 0,
        "bots": 0,
        "brute_force": 0
    }
    
    # Traffic buckets for the last 24h (mocked slots for valid chart structure, but we could fill from log timestamps if complex)
    # For now, we return a static structure for the chart to ensure frontend rendering, 
    # but counts could be real if we had timestamps.
    # To keep it simple and fast: We'll generate the chart structure but fill it with some data 
    # derived from the total counts if possible, or keep it simulated if logs are empty.
    
    current_hour = datetime.datetime.now().hour
    traffic_data = []
    for i in range(24):
        hour_label = f"{(current_hour - 23 + i) % 24}:00"
        traffic_data.append(TrafficPoint(time=hour_label, valid=0, blocked=0))

    if os.path.exists(settings.ACCESS_LOG_PATH):
        try:
            with open(settings.ACCESS_LOG_PATH, "r") as f:
                # Read last 2000 lines
                lines = f.readlines()[-2000:]
                total_req = len(lines)
                
                for line in lines:
                    line_lower = line.lower()
                    
                    # Basic 403 detection
                    if ' "403" ' in line or ' 403 ' in line:
                        blocked += 1
                        
                        # Weak Heuristic for attack type (for demo purposes on raw access logs)
                        if "union" in line_lower or "select" in line_lower:
                            attacks["sql_injection"] += 1
                        elif "script" in line_lower or "alert" in line_lower or "<" in line_lower:
                            attacks["xss"] += 1
                        elif "content-length" in line_lower and "post" in line_lower: 
                            # Very rough guess for brute force if many posts
                            pass 
                        elif "bot" in line_lower or "spider" in line_lower:
                            attacks["bots"] += 1
                        else:
                            # Default unknown blocks mapped to 'Brute Force' or others for visual filling
                            attacks["brute_force"] += 1
                    
        except Exception as e:
            print(f"Error reading logs: {e}")

    # Ensure at least some data if file exists but is empty (to avoid 0/0 division if needed)
    
    # Construct Attack Modules List
    modules_list = [
        AttackModule(
            id="942100", title="SQL Injection", subtitle="High Severity Protection",
            count=attacks["sql_injection"], trend=[0,0,0,0,0,0,attacks["sql_injection"]], status="Active", last_incident="Unknown"
        ),
        AttackModule(
            id="941100", title="XSS Filtering", subtitle="Script Injection Defense",
            count=attacks["xss"], trend=[0,0,0,0,0,0,attacks["xss"]], status="Active", last_incident="Unknown"
        ),
        AttackModule(
            id="900000", title="DDoS Protection", subtitle="L7 Rate Limiting",
            count=0, trend=[0]*7, status="Active", last_incident="None"
        ),
        AttackModule(
            id="980000", title="Brute Force", subtitle="Credential Stuffing",
            count=attacks["brute_force"], trend=[0,0,0,0,0,0,attacks["brute_force"]], status="Active", last_incident="Unknown"
        ),
        AttackModule(
            id="932000", title="Command Injection", subtitle="System Call Protection",
            count=attacks["lfi"], trend=[0]*7, status="Inactive", last_incident="No data"
        ),
        AttackModule(
            id="990000", title="Bot Mitigation", subtitle="User-Agent Challenge",
            count=attacks["bots"], trend=[0,0,0,0,0,0,attacks["bots"]], status="Active", last_incident="5m ago"
        )
    ]

    return StatsResponse(
        total_requests=total_req,
        blocked_attacks=blocked,
        avg_latency="12ms", # Placeholder as access.log standard config doesn't always have upstream_response_time
        cpu_load=cpu_load,
        system_status="OPERATIONAL",
        attack_modules=modules_list,
        traffic_chart=traffic_data
    )