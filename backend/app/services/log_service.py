import os
import time
import psutil
import datetime
import re
import random
import math
from collections import deque, defaultdict
from app.core.config import get_settings
from app.models.schemas import StatsResponse, AttackModule, TrafficPoint, WafLogEntry, WafLogListResponse
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
    for k in ["sql_injection", "xss", "lfi", "rce", "bad_bots", "brute_force", "dos", "protocol"]:
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
                                elif " 503 " in line or "ratelimit" in line_lower:
                                    attacks["dos"] += 1
                                elif " 400 " in line or " 405 " in line or " 413 " in line or " 414 " in line:
                                    attacks["protocol"] += 1
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
        AttackModule(id="BF-06", title="Brute Force", subtitle="Credential Protection", count=attacks["brute_force"], trend=generate_fake_trend(attacks["brute_force"]), status=rule_status.get("BF-06", "Active"), last_incident="2m ago"),
        AttackModule(id="DOS-07", title="DDoS / Flood", subtitle="Rate Limit Protection", count=attacks["dos"], trend=generate_fake_trend(attacks["dos"]), status=rule_status.get("DOS-07", "Active"), last_incident="Unknown"),
        AttackModule(id="PROTO-08", title="Protocol Violation", subtitle="Invalid Usage / Headers", count=attacks["protocol"], trend=generate_fake_trend(attacks["protocol"]), status=rule_status.get("PROTO-08", "Active"), last_incident="30m ago")
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
        return "LFI"
    if "; cat" in line_lower or "; ls" in line_lower or "$(whoami)" in line_lower or "cmd=" in line_lower:
        return "RCE"
    if "nmap" in line_lower or "sqlmap" in line_lower or "nikto" in line_lower or "bot" in line_lower:
        return "Scanner"
    if "head /" in line_lower: # Simple heuristic
        return "Scanner"
    if "login" in line_lower or "admin" in line_lower:
        # Heuristic for BF if status is 4xx, but let's label it interesting anyway
        return "Brute Force"
    if status_code == 503:
        return "HTTP Flood"
    if status_code in [400, 405, 413, 414]:
        return "Protocol Violation"
    
    if status_code >= 400 and status_code < 500:
         return "Suspicious"
         
    return "Safe"

def get_waf_logs(page: int = 1, limit: int = 10, search: str = None, status: str = None, attack_type: str = None, time_range: str = "Last 24h"):

    logs = []
    
    args = [search, status, attack_type, time_range]
    # Default if no specific filters (Time range defaults to Last 24h, so if it is default, we can consider it "default" ONLY if we assume log file is small or recent. But for big logs, 24h is a filter).
    # Actually, if time_range is "Last 24h" (default), we usually want to verify. 
    # Let's consider "default filter" only if NO filters are touched.
    # However, user asks to fix "filter table".
    # For optimization: If (search is None) AND (status is All) AND (attack_type is All) AND (time_range is All/Lifetime or just ignored), we do direct slice.
    # But current default `time_range` is "Last 24h". 
    # Let's handle "Last 24h" as a filter.
    
    # Calculate cutoff time
    now = datetime.datetime.now(datetime.timezone.utc)
    cutoff_time = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
    
    if time_range == "Last Hour":
        cutoff_time = now - datetime.timedelta(hours=1)
    elif time_range == "Last 24h":
        cutoff_time = now - datetime.timedelta(hours=24)
    elif time_range == "Last 3d":
        cutoff_time = now - datetime.timedelta(days=3)
    elif time_range == "Last 7d":
        # Note: frontend sends "Last 7d" but initially it was "7 Days". 
        # We handle both just in case.
        cutoff_time = now - datetime.timedelta(days=7)
    elif time_range == "7 Days":
        cutoff_time = now - datetime.timedelta(days=7)
    
    # Check if we can use optimized path
    # We can ONLY use optimized path if we are NOT filtering by anything AND time_range covers 'everything' (e.g. log file is newer than cutoff).
    # Safest is to use fallback scan if ANY filter is active.
    # We will assume "Last 24h" is a filter that requires scanning unless we are sure.
    # For this implementation, let's treat any time_range other than "All" (if we had it) as a filter.
    is_strict_default = (search is None or search == "") and (status is None or status == "All") and (attack_type is None or attack_type == "All") and (time_range == "All Time")  

    if os.path.exists(settings.ACCESS_LOG_PATH):
        try:
            with open(settings.ACCESS_LOG_PATH, "r") as f:
                lines = f.readlines()
                total = len(lines)
                
                # Optimized Path for Default Filters (Direct Slicing)
                if is_strict_default:
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
                        # Filtering
                        # Time Filter
                        try:
                            # entry.timestamp is "27/Oct/2023:14:02:11"
                            # Parse it
                            dt_entry = datetime.datetime.strptime(entry.timestamp, "%d/%b/%Y:%H:%M:%S").replace(tzinfo=datetime.timezone.utc)
                            if dt_entry < cutoff_time:
                                # Optimization: Since we read reversed (newest first), 
                                # if current log is older than cutoff, all subsequent logs are also older.
                                break
                        except:
                            # If parsing fails, maybe include or exclude?
                            pass

                        if search:
                            s = search.lower()
                            if s not in entry.source_ip.lower() and s not in entry.path.lower() and s not in entry.attack_type.lower():
                                continue

                        if status and status != "All":
                            # Generic check -> if status filter is a number, match it exactly
                            if status.isdigit() and entry.status_code != int(status):
                                continue

                        if attack_type and attack_type != "All":
                            if attack_type == "Attacks Only":
                                if entry.attack_type == "Safe": continue
                            elif attack_type == "Safe Traffic" or attack_type == "Allowed Only":
                                if entry.attack_type != "Safe": continue
                            elif entry.attack_type != attack_type:
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
    try:
        parts = line.split(' [')
        if len(parts) < 2: return None
        
        ip_part = line.split(' - -')[0].strip()
        time_part_raw = parts[1].split(']')[0]
        time_part = time_part_raw.split(' ')[0] # Remove +0000
        
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

    return "\n".join(output)

    return "\n".join(output)

def generate_html_report() -> str:
    """Generates a rich HTML report with charts and stats"""
    import json
    
    # 1. Fetch Data
    stats = analyze_logs("24h") # Default to 24h for report
    # Get last 100 logs for analysis, show 50 in table
    logs_data = get_waf_logs(limit=200, time_range="Last 24h")
    logs = logs_data.data
    
    # 2. Additional Analysis (Local Aggregation from sampled logs)
    # Top IPs
    ip_counts = defaultdict(int)
    path_counts = defaultdict(int)
    country_counts = defaultdict(int)
    
    for l in logs:
        if l.status_code in [403, 401]:
            ip_counts[l.source_ip] += 1
            path_counts[l.path] += 1
            country_counts[l.country] += 1

    top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_paths = sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Chart Data
    traffic_labels = [b.time for b in stats.traffic_chart]
    valid_data = [b.valid for b in stats.traffic_chart]
    blocked_data = [b.blocked for b in stats.traffic_chart]
    
    attack_counts = {m.title: m.count for m in stats.attack_modules if m.count > 0}
    atk_labels = list(attack_counts.keys())
    atk_values = list(attack_counts.values())
    
    # 3. Construct HTML
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WAF Security Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            @media print {{
                .no-print {{ display: none !important; }}
                .page-break {{ page-break-before: always; }}
                body {{ background: white; }}
            }}
            body {{ font-family: 'Inter', sans-serif; }}
        </style>
    </head>
    <body class="bg-slate-50 text-slate-900 p-8 md:p-12 max-w-7xl mx-auto">
        
        <!-- Header -->
        <div class="flex justify-between items-start mb-12 border-b border-slate-200 pb-8">
            <div class="flex items-center gap-4">
                <div class="p-3 bg-blue-600 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">WAF Security Report</h1>
                    <p class="text-slate-500 font-medium">Generated on {datetime.datetime.now().strftime("%d %B %Y, %H:%M")}</p>
                </div>
            </div>
            <div class="text-right no-print flex gap-3">
                 <button onclick="window.print()" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Save as PDF
                </button>
            </div>
        </div>

        <!-- Executive Summary -->
        <div class="mb-12">
            <h2 class="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                <span class="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Executive Summary
            </h2>
            <div class="grid grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Requests</div>
                    <div class="text-3xl font-bold text-slate-900">{stats.total_requests}</div>
                    <div class="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Threats Blocked</div>
                    <div class="text-3xl font-bold text-rose-600 dark:text-rose-500">{stats.blocked_attacks}</div>
                    <div class="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-600">
                         <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Latency</div>
                    <div class="text-3xl font-bold text-blue-600">{stats.avg_latency}</div>
                     <div class="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-blue-600">
                         <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                </div>
                 <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">System Status</div>
                    <div class="text-3xl font-bold text-emerald-600">{stats.system_status}</div>
                     <div class="absolute right-0 bottom-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-600">
                         <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-3 gap-8 mb-12">
            <!-- Traffic Chart -->
            <div class="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-slate-800">Traffic Volume (24h)</h3>
                    <div class="flex gap-4 text-xs font-medium text-slate-500">
                         <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Valid</span>
                         <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Blocked</span>
                    </div>
                </div>
                <div class="h-64">
                    <canvas id="trafficChart"></canvas>
                </div>
            </div>
            
            <!-- Attack Type Chart -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-6">Threat Distribution</h3>
                <div class="h-64 relative">
                    <canvas id="attackChart"></canvas>
                     <div class="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span class="text-2xl font-bold text-slate-800">{stats.blocked_attacks}</span>
                        <span class="text-xs text-slate-500 uppercase">Threats</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Network Intelligence -->
        <div class="grid grid-cols-2 gap-8 mb-12 page-break">
            
            <!-- Top Attacking IPs -->
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <h3 class="font-bold text-slate-800 text-sm">Top Attacking Sources</h3>
                </div>
                <table class="w-full text-left text-sm">
                    <tbody class="divide-y divide-slate-100">
                        {''.join(f'''
                        <tr class="hover:bg-slate-50">
                            <td class="px-6 py-3 font-mono text-slate-600">{ip}</td>
                            <td class="px-6 py-3 text-right">
                                <span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">{count} Hits</span>
                            </td>
                        </tr>
                        ''' for ip, count in top_ips) if top_ips else '<tr><td class="p-6 text-center text-slate-400">No data available</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- Top Targeted Paths -->
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <h3 class="font-bold text-slate-800 text-sm">Top Targeted Paths</h3>
                </div>
                <table class="w-full text-left text-sm">
                    <tbody class="divide-y divide-slate-100">
                        {''.join(f'''
                        <tr class="hover:bg-slate-50">
                            <td class="px-6 py-3 font-mono text-slate-600 break-all">{path}</td>
                            <td class="px-6 py-3 text-right">
                                <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{count}</span>
                            </td>
                        </tr>
                        ''' for path, count in top_paths) if top_paths else '<tr><td class="p-6 text-center text-slate-400">No data available</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Top Logs Table -->
         <h2 class="text-lg font-bold mb-6 flex items-center gap-2 mt-8 text-slate-800">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
            Recent Security Events
        </h2>
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-6 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Time</th>
                        <th class="px-6 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Source</th>
                        <th class="px-6 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Country</th>
                        <th class="px-6 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Attack Type</th>
                        <th class="px-6 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    {''.join(f'''
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td class="px-6 py-3 font-mono text-slate-700">{log.source_ip}</td>
                        <td class="px-6 py-3 text-slate-600">{log.country}</td>
                        <td class="px-6 py-3">
                            <span class="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide {'bg-rose-100 text-rose-700 border border-rose-200' if log.attack_type != 'Safe' else 'bg-slate-100 text-slate-600 border border-slate-200'}">
                                {log.attack_type}
                            </span>
                        </td>
                         <td class="px-6 py-3 text-right">
                            <span class="font-bold text-xs {'text-rose-600' if log.status_code in [403, 401] else 'text-emerald-600'}">
                                {'BLOCKED' if log.status_code in [403, 401] else 'ALLOWED'}
                            </span>
                        </td>
                    </tr>
                    ''' for log in logs[:50])}
                </tbody>
            </table>
        </div>

        <div class="text-center text-slate-400 text-xs mt-12 mb-8">
            <p>End of Report • {datetime.datetime.now().year} © Gafnaa WAF Dashboard</p>
        </div>

        <script>
            // Traffic Chart
            const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
            new Chart(ctxTraffic, {{
                type: 'line',
                data: {{
                    labels: {json.dumps(traffic_labels)},
                    datasets: [
                        {{
                            label: 'Valid Requests',
                            data: {valid_data},
                            borderColor: '#3b82f6',
                            backgroundColor: (context) => {{
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
                                gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                                return gradient;
                            }},
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        }},
                        {{
                            label: 'Blocked Threats',
                            data: {blocked_data},
                            borderColor: '#e11d48',
                            backgroundColor: (context) => {{
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                                gradient.addColorStop(0, 'rgba(225, 29, 72, 0.2)');
                                gradient.addColorStop(1, 'rgba(225, 29, 72, 0)');
                                return gradient;
                            }},
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        }}
                    ]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{ legend: {{ display: false }} }},
                    interaction: {{ mode: 'index', intersect: false }},
                    scales: {{ 
                        y: {{ beginAtZero: true, grid: {{ color: '#f1f5f9' }} }},
                        x: {{ grid: {{ display: false }} }}
                    }}
                }}
            }});

            // Attack Chart
            const ctxAttack = document.getElementById('attackChart').getContext('2d');
            new Chart(ctxAttack, {{
                type: 'doughnut',
                data: {{
                    labels: {json.dumps(atk_labels)},
                    datasets: [{{
                        data: {atk_values},
                        backgroundColor: [
                            '#e11d48', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {{ legend: {{ position: 'bottom', labels: {{ usePointStyle: true, boxWidth: 8 }} }} }}
                }}
            }});
        </script>
    </body>
    </html>
    """
    return html