from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    ACCESS_LOG_PATH: str = "dummy_access.log"
    WAF_CONFIG_PATH: str = "/etc/nginx/modsec/waf-tuning.conf"
    ALLOWED_ORIGINS: list = ["http://localhost:3000"]
    allow_credentials: bool = False

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()