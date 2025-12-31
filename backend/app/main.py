from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import StatsResponse, WafRuleRequest, CommandResponse, WafRuleStatus, RuleToggleRequest
from app.services import log_service, system_service
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title="Nginx Sentinel API")

# Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Di production, ganti dengan settings.ALLOWED_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "Rocky Linux 9"}

@app.get("/api/stats", response_model=StatsResponse)
def get_stats():
    return log_service.analyze_logs()

@app.post("/api/waf/rule", response_model=CommandResponse)
def add_rule(rule: WafRuleRequest):
    return system_service.add_waf_rule(str(rule.ip), rule.action)

# --- Endpoint Baru untuk Rule Tuning ---
@app.get("/api/waf/rules", response_model=List[WafRuleStatus])
def get_rules():
    return system_service.get_waf_rules()

@app.post("/api/waf/rules/toggle", response_model=CommandResponse)
def toggle_rule(req: RuleToggleRequest):
    return system_service.toggle_rule(req.rule_id, req.enable)
# ---------------------------------------

@app.post("/api/system/restart", response_model=CommandResponse)
def restart_server():
    return system_service.restart_nginx()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)