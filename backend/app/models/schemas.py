from pydantic import BaseModel, IPvAnyAddress
from typing import List, Optional

class StatsResponse(BaseModel):
    total_requests: int
    blocked_attacks: int
    cache_hit_rate: float
    status: str

class WafRuleRequest(BaseModel):
    ip: IPvAnyAddress
    action: str  # 'deny' atau 'allow'
    comment: Optional[str] = None

class RuleToggleRequest(BaseModel):
    rule_id: str
    enable: bool

class WafRuleStatus(BaseModel):
    id: str
    name: str
    description: str
    is_enabled: bool
    category: str

class CommandResponse(BaseModel):
    status: str
    message: str