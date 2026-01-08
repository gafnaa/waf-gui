from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from app.models.schemas import StatsResponse, WafRuleRequest, CommandResponse, WafRuleStatus, RuleToggleRequest, LoginRequest, CustomRuleRequest, IpRule, ActiveIp, SystemHealth, WafLogListResponse, ProfileUpdateRequest, PasswordChangeRequest, UserResponse, HotlinkConfig
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

from app.db import init_db

@app.on_event("startup")
def on_startup():
    init_db()

# --- Public Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "Rocky Linux 9"}

@app.post("/api/login")
def login(login_data: LoginRequest):
    user = auth_service.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = auth_service.create_access_token(data={"sub": user['username']})
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user['username'], "full_name": user.get("full_name", "User")}}

@app.get("/api/user", response_model=UserResponse)
def get_user_info(user = Depends(auth_service.get_current_user)):
    return user

@app.put("/api/user/profile", response_model=UserResponse)
def update_profile(req: ProfileUpdateRequest, user = Depends(auth_service.get_current_user)):
    return auth_service.update_profile(user['username'], req.full_name)

@app.put("/api/user/password", response_model=CommandResponse)
def update_password(req: PasswordChangeRequest, user = Depends(auth_service.get_current_user)):
    success = auth_service.change_password(user['username'], req.current_password, req.new_password)
    return CommandResponse(status="success", message="Password updated successfully")

# --- Protected Endpoints ---

@app.get("/api/stats", response_model=StatsResponse)
def get_stats(range: str = "live", user = Depends(auth_service.get_current_user)):
    return log_service.analyze_logs(range)

@app.get("/api/reports/export")
def export_report(format: str = "html", time_range: str = "24h", user = Depends(auth_service.get_current_user)):
    if format == "csv":
        csv_content = log_service.export_logs_csv()
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=waf_report.csv"})
    else:
        # Default to HTML
        html_content = log_service.generate_html_report(time_range)
        return Response(content=html_content, media_type="text/html", headers={"Content-Disposition": "attachment; filename=waf_report.html"})

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

@app.get("/api/waf/active-ips", response_model=List[ActiveIp])
def get_active_ips(user = Depends(auth_service.get_current_user)):
    return log_service.get_active_ips()

@app.get("/api/logs", response_model=WafLogListResponse)
def get_waf_logs(
    page: int = 1, 
    limit: int = 10, 
    search: str = None, 
    status: str = "All", 
    attack_type: str = "All",
    time_range: str = "Last 24h",
    user = Depends(auth_service.get_current_user)
):
    return log_service.get_waf_logs(page, limit, search, status, attack_type, time_range)

@app.delete("/api/waf/rule", response_model=CommandResponse)
def delete_rule(ip: str, user = Depends(auth_service.get_current_user)):
    return system_service.delete_ip_rule(ip)

@app.post("/api/system/restart", response_model=CommandResponse)
def restart_server(user = Depends(auth_service.get_current_user)):
    return system_service.restart_nginx()

@app.get("/api/waf/custom")
def get_custom_rules(user = Depends(auth_service.get_current_user)):
    return system_service.get_custom_rules()

@app.get("/api/system/status", response_model=SystemHealth)
def get_system_status(user = Depends(auth_service.get_current_user)):
    return system_service.get_system_health()

@app.post("/api/waf/custom", response_model=CommandResponse)
def save_custom_rules(req: CustomRuleRequest, user = Depends(auth_service.get_current_user)):
    return system_service.save_custom_rules(req.content)

@app.post("/api/system/clear-cache", response_model=CommandResponse)
def clear_cache(user = Depends(auth_service.get_current_user)):
    return system_service.clear_cache()

@app.post("/api/system/services/{service_name}/{action}", response_model=CommandResponse)
def manage_service_endpoint(service_name: str, action: str, user = Depends(auth_service.get_current_user)):
    return system_service.manage_service(service_name, action)

@app.get("/api/waf/hotlink", response_model=HotlinkConfig)
def get_hotlink_config(user = Depends(auth_service.get_current_user)):
    return system_service.get_hotlink_config()

@app.post("/api/waf/hotlink", response_model=CommandResponse)
def save_hotlink_config(config: HotlinkConfig, user = Depends(auth_service.get_current_user)):
    return system_service.save_hotlink_config(config.dict())

@app.post("/api/system/factory-reset", response_model=CommandResponse)
def factory_reset(user = Depends(auth_service.get_current_user)):
    # Optional: Check if user is strict admin
    return system_service.factory_reset()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)