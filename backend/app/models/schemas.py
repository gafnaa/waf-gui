from pydantic import BaseModel
from typing import List, Optional

# --- Sub-models untuk Dashboard ---
class TrafficPoint(BaseModel):
    time: str
    valid: int
    blocked: int

class AttackModule(BaseModel):
    id: str
    title: str
    subtitle: str
    count: int
    trend: List[int]
    status: str
    last_incident: str

# --- Stats Response Updated ---
class StatsResponse(BaseModel):
    # Top Cards
    total_requests: int
    blocked_attacks: int
    avg_latency: str
    cpu_load: str
    
    # System info
    system_status: str
    
    # Detailed Data
    attack_modules: List[AttackModule]
    traffic_chart: List[TrafficPoint]

class WafRuleRequest(BaseModel):
    ip: str # Changed from IPvAnyAddress to str to support CIDR
    action: str  # 'deny' or 'allow'
    note: Optional[str] = None
    duration: Optional[str] = "Permanent"

class IpRule(BaseModel):
    ip: str
    action: str
    note: str
    duration: str
    region: str = "Unknown" # Placeholder for GeoIP
    status: str = "Active"

class ActiveIp(BaseModel):
    ip: str
    country: str
    request_count: int
    attack_count: int
    last_seen: str
    rule_status: str # 'None', 'Blocked', 'Allowed'

class CommandResponse(BaseModel):
    status: str
    message: str

class LoginRequest(BaseModel):
    username: str
    password: str

class CustomRuleRequest(BaseModel):
    content: str

class RuleToggleRequest(BaseModel):
    rule_id: str
    enable: bool

class WafRuleStatus(BaseModel):
    id: str
    name: str
    desc: str
    enabled: bool
    category: str

class ServiceStatus(BaseModel):
    name: str
    status: str # 'Active', 'Inactive', 'Sleeping'
    pid: str
    cpu: str
    uptime: str

class SystemHealth(BaseModel):
    uptime: str
    ram_usage: dict # {"used": 8.4, "total": 16, "percent": 52.5}
    cpu_usage: int
    disk_usage: dict # {"used_percent": 85, "path": "/var/log"}
    load_avg: float
    network: dict # {"in": 120, "out": 50}
    services: List[ServiceStatus]

class WafLogEntry(BaseModel):
    id: int
    timestamp: str
    source_ip: str
    method: str
    path: str
    attack_type: str # 'SQL Injection', 'XSS', 'Safe', etc.
    status_code: int
    country: str

class WafLogListResponse(BaseModel):
    data: List[WafLogEntry]
    total: int
    page: int
    limit: int
    total_pages: int

class HotlinkConfig(BaseModel):
    extensions: List[str]
    domains: List[str]

# User Management Schemas
class ProfileUpdateRequest(BaseModel):
    full_name: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    username: str
    full_name: Optional[str] = None