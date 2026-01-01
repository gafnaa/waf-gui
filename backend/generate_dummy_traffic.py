import os
import time
import random
import datetime

# File path matching what we will set in .env
LOG_FILE_PATH = os.path.join(os.path.dirname(__file__), "dummy_access.log")

user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
    "sqlmap/1.5.10#stable",
    "Nikto/2.1.6",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "python-requests/2.25.1"
]

paths = [
    "/",
    "/login",
    "/dashboard",
    "/api/users",
    "/about",
    "/contact",
    "/products/123"
]

attack_patterns = [
    # SQL Injection
    ('/products?id=1 OR 1=1', 403, "sql_injection"), 
    ('/login?u=admin&p=1\' OR \'1\'=\'1', 403, "sql_injection"),
    
    # XSS
    ('/search?q=<script>alert(1)</script>', 403, "xss"),
    ('/comment?msg=<img src=x onerror=alert(1)>', 403, "xss"),
    
    # LFI
    ('/get_file?file=../../../../etc/passwd', 403, "lfi"),
    ('/view?page=../../boot.ini', 403, "lfi"),
    
    # RCE
    ('/api/ping?host=127.0.0.1; cat /etc/shadow', 403, "rce"),
    ('/upload.php?cmd=whoami', 403, "rce"),
    
    # Brute Force (simulated by rapid 403s on login, but here just single lines)
    ('/login', 401, "brute_force"),
    ('/wp-login.php', 403, "brute_force"),
    
    # Bad Bots
    ('/robots.txt', 200, "normal"),
    ('/admin_backup.zip', 404, "bad_bots"), # Scanner
    ('/.git/config', 403, "bad_bots")
]

def generate_log_line():
    ip = f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("[%d/%b/%Y:%H:%M:%S +0000]")
    
    # 70% Normal traffic, 30% Attack
    if random.random() > 0.3:
        # Normal
        method = "GET"
        path = random.choice(paths)
        status = 200
        size = random.randint(500, 5000)
        ua = user_agents[random.randint(0, 2)]
        referer = "-"
    else:
        # Attack
        pattern = random.choice(attack_patterns)
        method = "GET" if random.random() > 0.5 else "POST"
        path = pattern[0]
        status = pattern[1]
        
        # Override UA for bots sometimes
        if pattern[2] == "bad_bots":
            ua = "Nmap Scripting Engine"
        elif pattern[2] == "sql_injection":
             ua = "sqlmap/1.5.10#stable" if random.random() > 0.5 else user_agents[0]
        else:
            ua = user_agents[random.randint(0, 6)]
            
        size = random.randint(100, 1000)
        referer = "-"

    # Nginx default format: 
    # $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
    log_line = f'{ip} - - {timestamp} "{method} {path} HTTP/1.1" {status} {size} "{referer}" "{ua}"'
    return log_line

print(f"Generating dummy logs to: {LOG_FILE_PATH}")
print("Press Ctrl+C to stop.")

try:
    while True:
        with open(LOG_FILE_PATH, "a") as f:
            # Write a burst of requests
            for _ in range(random.randint(1, 5)):
                f.write(generate_log_line() + "\n")
        
        # Sleep a bit to simulate real traffic time
        time.sleep(random.uniform(0.1, 1.0))
except KeyboardInterrupt:
    print("\nStopped.")
