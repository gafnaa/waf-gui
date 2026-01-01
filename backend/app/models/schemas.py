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
    ip: IPvAnyAddress
    action: str  # 'deny' or 'allow'
    comment: Optional[str] = None

class CommandResponse(BaseModel):
    status: str
    message: str

class LoginRequest(BaseModel):
    username: str
    password: str

class RuleToggleRequest(BaseModel):
    rule_id: str
    enable: bool

class WafRuleStatus(BaseModel):
    id: str
    name: str
    description: str
    is_enabled: bool
    category: str