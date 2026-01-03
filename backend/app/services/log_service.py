import os
import time
import psutil
import datetime
import re
import random
import math
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

def get_attack_type(line: str, status_code: int) -> str:
    line_lower = line.lower()
    
    # Check for specific patterns
    if "union" in line_lower or "select" in line_lower or " or " in line_lower or "='" in line:
        return "SQL Injection"
    if "<script>" in line_lower or "alert(" in line_lower or "onerror=" in line_lower:
        return "XSS"
    if "../" in line or "..%2f" in line_lower or "/etc/passwd" in line_lower:
        return "Path Traversal"
    if "; cat" in line_lower or "; ls" in line_lower or "$(whoami)" in line_lower or "cmd=" in line_lower:
        return "RCE"
    if "nmap" in line_lower or "sqlmap" in line_lower or "nikto" in line_lower or "bot" in line_lower:
        return "Scanner"
    if "head /" in line_lower: # Simple heuristic
        return "Scanner"
    
    if status_code >= 400 and status_code < 500:
         return "Suspicious"
         
    return "Safe"

def get_waf_logs(page: int = 1, limit: int = 10, search: str = None, status: str = None, attack_type: str = None):
    from app.models.schemas import WafLogEntry, WafLogListResponse
    
    logs = []
    
    args = [search, status, attack_type]
    is_default_filter = all(a is None or a == "All" for a in args)

    if os.path.exists(settings.ACCESS_LOG_PATH):
        try:
            with open(settings.ACCESS_LOG_PATH, "r") as f:
                lines = f.readlines()
                total = len(lines)
                
                # Optimized Path for Default Filters (Direct Slicing)
                if is_default_filter:
                    # Reverse Index Logic
                    # Newest is at index len-1. 
                    # Page 1 (0-10) -> indices [len-1, len-2 ... len-10]
                    start_idx = (page - 1) * limit
                    end_idx = start_idx + limit
                    
                    # Ensure boundaries
                    # If total=100, page=1, start=0, end=10.
                    # We want lines from (total-1-0) down to (total-1-9)
                    
                    logs_data = []
                    count = 0
                    # Iterate backwards from end of file
                    for i in range(len(lines) - 1, -1, -1):
                        if count >= end_idx:
                            break
                        
                        if count >= start_idx:
                            line = lines[i]
                            # Parse SINGLE line
                            parsed = parse_single_line_safely(line, i, len(lines))
                            if parsed:
                                logs.append(parsed)
                                
                        count += 1
                        
                    return WafLogListResponse(
                        data=logs,
                        total=total,
                        page=page,
                        limit=limit,
                        total_pages=math.ceil(total / limit)
                    )

                # Fallback: Full Scan for Filtered Results (Existing Logic)
                # Parse in reverse to show newest first
                for i, line in enumerate(reversed(lines)):
                    # existing parsing logic...
                    try:
                        entry = parse_single_line_safely(line, i, len(lines))
                        if not entry: continue

                        # Filtering
                        if search:
                            s = search.lower()
                            if s not in entry.source_ip.lower() and s not in entry.path.lower() and s not in entry.attack_type.lower():
                                continue

                        if status and status != "All":
                            if status == "403" and entry.status_code != 403: continue
                            if status == "200" and entry.status_code != 200: continue
                            if status == "500" and entry.status_code != 500: continue
                        
                        if attack_type and attack_type != "All":
                            if attack_type == "Attacks Only" and entry.attack_type == "Safe":
                                continue
                            if attack_type != "Attacks Only" and entry.attack_type != attack_type:
                                 continue
                        
                        logs.append(entry)
                    except Exception:
                        continue
                        
        except Exception as e:
            print(f"Error parse logs: {e}")

    # Pagination for Filtered Results
    total = len(logs)
    start = (page - 1) * limit
    end = start + limit
    data = logs[start:end]
    
    return WafLogListResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit)
    )

def parse_single_line_safely(line, index, total_lines):
    from app.models.schemas import WafLogEntry
    try:
        parts = line.split(' [')
        if len(parts) < 2: return None
        
        ip_part = line.split(' - -')[0].strip()
        time_part = parts[1].split(']')[0]
        
        rest = parts[1].split(']')[1]
        req_parts = rest.split('"')
        if len(req_parts) < 2: return None
        
        request_line = req_parts[1]
        req_tokens = request_line.split()
        method = req_tokens[0] if len(req_tokens) > 0 else "-"
        path = req_tokens[1] if len(req_tokens) > 1 else "-"
        
        if len(rest.split('"')) > 2:
             status_part = rest.split('"')[2].strip().split()[0]
             status_code = int(status_part) if status_part.isdigit() else 0
        else:
             status_code = 0
        
        current_type = get_attack_type(line, status_code)
        if status_code == 200 and current_type == "Suspicious":
            current_type = "Safe"
            
        countries = ["US", "DE", "CN", "RU", "ID", "SG", "JP", "BR"]
        c_idx = sum(map(ord, ip_part)) % len(countries)

        return WafLogEntry(
            id=total_lines - index, # ID based on line number (approx)
            timestamp=time_part,
            source_ip=ip_part,
            method=method,
            path=path,
            attack_type=current_type,
            status_code=status_code,
            country=countries[c_idx]
        )
    except:
        return None