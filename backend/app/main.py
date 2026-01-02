from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from app.models.schemas import StatsResponse, WafRuleRequest, CommandResponse, WafRuleStatus, RuleToggleRequest, LoginRequest, CustomRuleRequest, IpRule
from app.services import log_service, system_service, auth_service
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

# --- Public Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "Rocky Linux 9"}

@app.post("/api/login")
def login(login_data: LoginRequest):
    user = auth_service.FAKE_USERS_DB.get(login_data.username)
    if not user or not auth_service.verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = auth_service.create_access_token(data={"sub": user['username']})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Protected Endpoints ---

@app.get("/api/stats", response_model=StatsResponse)
def get_stats(range: str = "live", user = Depends(auth_service.get_current_user)):
    return log_service.analyze_logs(range)

@app.get("/api/waf/rules", response_model=List[WafRuleStatus])
def get_rules(user = Depends(auth_service.get_current_user)):
    return system_service.get_waf_rules()

@app.post("/api/waf/rules/toggle", response_model=CommandResponse)
def toggle_rule(req: RuleToggleRequest, user = Depends(auth_service.get_current_user)):
    return system_service.toggle_rule(req.rule_id, req.enable)

@app.post("/api/waf/rule", response_model=CommandResponse)
def add_rule(rule: WafRuleRequest, user = Depends(auth_service.get_current_user)):
    return system_service.add_waf_rule(str(rule.ip), rule.action, rule.note, rule.duration)

@app.get("/api/waf/ip-rules", response_model=List[IpRule])
def get_ip_rules(user = Depends(auth_service.get_current_user)):
    return system_service.get_ip_rules()

@app.delete("/api/waf/rule", response_model=CommandResponse)
def delete_rule(ip: str, user = Depends(auth_service.get_current_user)):
    return system_service.delete_ip_rule(ip)

@app.post("/api/system/restart", response_model=CommandResponse)
def restart_server(user = Depends(auth_service.get_current_user)):
    return system_service.restart_nginx()

@app.get("/api/waf/custom")
def get_custom_rules(user = Depends(auth_service.get_current_user)):
    return system_service.get_custom_rules()

@app.post("/api/waf/custom", response_model=CommandResponse)
def save_custom_rules(req: CustomRuleRequest, user = Depends(auth_service.get_current_user)):
    return system_service.save_custom_rules(req.content)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)