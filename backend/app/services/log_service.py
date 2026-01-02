import os
import time
import psutil
import datetime
import re
import random
from collections import deque, defaultdict
from app.core.config import get_settings
from app.models.schemas import StatsResponse, AttackModule, TrafficPoint
from app.services import system_service

settings = get_settings()

def generate_fake_trend(final_count: int, length: int = 7):
    if final_count == 0:
        return [0] * length
    base = max(1, final_count // 10)
    return [random.randint(0, base + int(base * 0.5)) for _ in range(length)]

def parse_nginx_time(log_time_str):
    # Example: [01/Jan/2026:14:02:40 +0000]
    try:
        # Strip brackets
        clean = log_time_str.strip("[]")
        # Parse format: 01/Jan/2026:14:02:40 +0000
        dt = datetime.datetime.strptime(clean, "%d/%b/%Y:%H:%M:%S %z")
        return dt
    except Exception as e:
        return None

def analyze_logs(time_range: str = "live") -> StatsResponse:
    # 1. System Stats (Real)
    cpu_load = f"{psutil.cpu_percent()}%"
    
    # 2. Define Time Window and Granularity
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if time_range == "1h":
        window_size = datetime.timedelta(hours=1)
        step = datetime.timedelta(minutes=5) # 12 points
        label_fmt = "%H:%M"
    elif time_range == "24h":
        window_size = datetime.timedelta(hours=24)
        step = datetime.timedelta(hours=1) # 24 points
        label_fmt = "%H:00"
    elif time_range == "7d":
        window_size = datetime.timedelta(days=7)
        step = datetime.timedelta(days=1) # 7 points
        label_fmt = "%d %b"
    else: # "live" - default to last 30 minutes
        window_size = datetime.timedelta(minutes=30)
        step = datetime.timedelta(minutes=2) # 15 points
        label_fmt = "%H:%M"

    start_time = now - window_size
    
    # 3. Initialize Buckets
    # We calculate how many buckets we need.
    num_buckets = int(window_size.total_seconds() / step.total_seconds())
    # Adjust slightly if rounding issues, but fixed numbers are safer for UI.
    # Let's use flexible buckets.
    
    buckets = []
    bucket_map = {} # index -> TrafficPoint
    
    # Pre-fill buckets with correct time labels
    # We iterate from 0 to num_buckets-1
    for i in range(num_buckets):
        bucket_time = start_time + (step * i)
        # For "live" or "1h", we might want the label to be the END of the bucket or START.
        # Let's use START of bucket for simplicity.
        label = bucket_time.strftime(label_fmt)
        tp = TrafficPoint(time=label, valid=0, blocked=0)
        buckets.append(tp)
        # We don't need a map if we index by math, but let's keep list 'buckets' ordered.

    total_req = 0
    blocked = 0
    attacks = defaultdict(int) 
    # Init keys for API consistency
    for k in ["sql_injection", "xss", "lfi", "rce", "bad_bots", "brute_force"]:
        attacks[k] = 0
    
    # Fetch current rule configuration
    rules_config = system_service.get_waf_rules()
    rule_status = {r['id']: ("Active" if r['enabled'] else "Inactive") for r in rules_config}
    
    # 4. Read and Process Logs
    if os.path.exists(settings.ACCESS_LOG_PATH):
        try:
            with open(settings.ACCESS_LOG_PATH, "r") as f:
                lines = f.readlines()
                
                for line in lines:
                    # Parse Time
                    # Log format: IP - - [TIMESTAMP] ...
                    parts = line.split(' [')
                    if len(parts) > 1:
                        time_part = parts[1].split(']')[0]
                        log_time = parse_nginx_time(time_part)
                        
                        if log_time:
                            # Filter
                            if log_time < start_time:
                                continue
                            if log_time > now:
                                continue 
                            
                            line_lower = line.lower()
                            
                            # Increment Counters
                            total_req += 1
                            is_blocked = ' 403 ' in line or ' 401 ' in line
                            if is_blocked:
                                blocked += 1
                            
                            # Categorize Attack
                            if is_blocked:
                                if "union" in line_lower or "select" in line_lower or " or " in line_lower or "='" in line:
                                    attacks["sql_injection"] += 1
                                elif "<script>" in line_lower or "alert(" in line_lower or "onerror=" in line_lower:
                                    attacks["xss"] += 1
                                elif "../" in line or "..%2f" in line_lower or "/etc/passwd" in line_lower:
                                    attacks["lfi"] += 1
                                elif "; cat" in line_lower or "; ls" in line_lower or "$(whoami)" in line_lower or "cmd=" in line_lower:
                                    attacks["rce"] += 1
                                elif "nmap" in line_lower or "sqlmap" in line_lower or "nikto" in line_lower or "bot" in line_lower:
                                    attacks["bad_bots"] += 1
                                elif "login" in line_lower or "admin" in line_lower:
                                    attacks["brute_force"] += 1
                                else:
                                    attacks["bad_bots"] += 1
                            
                            # Map to Bucket
                            idx = int((log_time - start_time).total_seconds() / step.total_seconds())
                            if 0 <= idx < len(buckets):
                                if is_blocked:
                                    buckets[idx].blocked += 1
                                else:
                                    buckets[idx].valid += 1

        except Exception as e:
            print(f"Error reading logs: {e}")

    # Build Modules List
    modules_list = [
        AttackModule(id="SQL-01", title="SQL Injection", subtitle="High Severity Protection", count=attacks["sql_injection"], trend=generate_fake_trend(attacks["sql_injection"]), status=rule_status.get("SQL-01", "Active"), last_incident="1m ago"),
        AttackModule(id="XSS-02", title="XSS", subtitle="Script Injection Defense", count=attacks["xss"], trend=generate_fake_trend(attacks["xss"]), status=rule_status.get("XSS-02", "Active"), last_incident="5m ago"),
        AttackModule(id="LFI-03", title="LFI", subtitle="Local File Inclusion", count=attacks["lfi"], trend=generate_fake_trend(attacks["lfi"]), status=rule_status.get("LFI-03", "Active"), last_incident="Unknown"),
        AttackModule(id="RCE-04", title="RCE", subtitle="Remote Code Execution", count=attacks["rce"], trend=generate_fake_trend(attacks["rce"]), status=rule_status.get("RCE-04", "Active"), last_incident="Unknown"),
        AttackModule(id="BOT-05", title="Bad Bots", subtitle="Crawler & Scanner Def", count=attacks["bad_bots"], trend=generate_fake_trend(attacks["bad_bots"]), status=rule_status.get("BOT-05", "Active"), last_incident="Just now"),
        AttackModule(id="BF-06", title="Brute Force", subtitle="Credential Protection", count=attacks["brute_force"], trend=generate_fake_trend(attacks["brute_force"]), status=rule_status.get("BF-06", "Active"), last_incident="2m ago")
    ]

    return StatsResponse(
        total_requests=total_req,
        blocked_attacks=blocked,
        avg_latency="15ms", 
        cpu_load=cpu_load,
        system_status="OPERATIONAL",
        attack_modules=modules_list,
        traffic_chart=buckets
    )

def get_active_ips(window_minutes: int = 60):
    from app.models.schemas import ActiveIp
    
    # 1. Get Current Rules
    rules = system_service.get_ip_rules()
    # Map IP -> Action ('deny', 'allow')
    rule_map = {r['ip']: r['action'] for r in rules}
    
    # 2. Parse Logs
    ip_stats = defaultdict(lambda: {"req": 0, "atk": 0, "last": datetime.datetime.min})
    
    now = datetime.datetime.now(datetime.timezone.utc)
    start_time = now - datetime.timedelta(minutes=window_minutes)
    
    if os.path.exists(settings.ACCESS_LOG_PATH):
        try:
            with open(settings.ACCESS_LOG_PATH, "r") as f:
                lines = f.readlines()
                # Debug: if lines is huge, we might want to slice the last N lines to be faster
                # But for < 100k lines it's fine.
                
                for line in lines:
                    parts = line.split(' [')
                    if len(parts) > 1:
                        ip = line.split(' - -')[0].strip()
                        time_part = parts[1].split(']')[0]
                        dt = parse_nginx_time(time_part)
                        
                        # Fallback if parsing fails to ensure data visibility
                        if dt is None:
                             dt = now 

                        if dt >= start_time:
                            s = ip_stats[ip]
                            s["req"] += 1
                            if s["last"] == datetime.datetime.min or dt > s["last"]:
                                s["last"] = dt
                            
                            if ' 403 ' in line or ' 401 ' in line:
                                s["atk"] += 1
                                
        except Exception as e:
            print(f"Error parse active ips: {e}")

    # 3. Format Result
    results = []
    countries = ["US", "DE", "CN", "RU", "ID", "SG", "JP", "BR"]
    
    for ip, stats in ip_stats.items():
        # Determine Status
        r_status = "None"
        if ip in rule_map:
            r_status = "Blocked" if rule_map[ip] == "deny" else "Allowed"
            
        # Fake Country (deterministic by IP)
        c_idx = sum(map(ord, ip)) % len(countries)
        
        results.append(ActiveIp(
            ip=ip,
            country=countries[c_idx],
            request_count=stats["req"],
            attack_count=stats["atk"],
            last_seen=stats["last"].strftime("%H:%M:%S"),
            rule_status=r_status
        ))
        
    # Sort by activity (desc)
    results.sort(key=lambda x: x.request_count, reverse=True)
    return results[:50] # Top 50