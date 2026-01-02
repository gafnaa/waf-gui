from pydantic import BaseModel, IPvAnyAddress
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