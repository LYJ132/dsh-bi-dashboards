from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Data access API 配置，环境变量驱动（容器内用 biz-postgres，宿主机手动跑改 localhost）。"""

    db_host: str = "biz-postgres"
    db_port: int = 5432
    db_name: str = "unmanned_supermarket"
    db_user: str = "appuser"
    db_password: str = "ChangeMe_Strong_123"
    # 连接池上限受控，避免之前 store-ai-dashboard 泄漏 100 个 idle 连接挤爆数据库
    db_pool_min_size: int = 2
    db_pool_max_size: int = 10

    model_config = {"env_prefix": "DB_", "case_sensitive": False}


class AppSettings(BaseSettings):
    """非 DB 前缀的系统配置（设置页 token 等）。"""

    # 设置页访问 token（环境变量注入，防内网乱改配置）
    settings_token: str = "CHANGE_ME_SETTINGS_TOKEN"

    model_config = {"case_sensitive": False}


settings = Settings()
app_settings = AppSettings()

DSN = (
    f"postgres://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
)
