"""运行时配置（环境变量驱动，无默认凭据）。

安全约束（审计 A6）：
- 数据库密码 `DB_PASSWORD` **没有默认值**：必须来自环境变量/密钥注入。
  未设置时进程在导入阶段即失败（fail loudly），杜绝用硬编码口令连库。
- 宿主机手动跑改 localhost；容器内用 biz-postgres。

注意：A1/A2（鉴权中间件 / settings_token 校验）按用户决策不在本次范围，
`settings_token` 目前无消费方，保留但已移除"看似真实"的默认值。
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Data access API 数据库配置，环境变量驱动。"""

    db_host: str = "biz-postgres"
    db_port: int = 5432
    db_name: str = "unmanned_supermarket"
    db_user: str = "appuser"
    # 无默认值：必须通过 DB_PASSWORD 环境变量注入，否则启动失败（见下方校验器）。
    db_password: str
    # 连接池上限受控，避免历史版本泄漏 100 个 idle 连接挤爆数据库
    db_pool_min_size: int = 2
    db_pool_max_size: int = 10

    # 字段名已含 db_ 前缀，故不再叠加 env_prefix：环境变量即 DB_HOST/DB_PASSWORD/... （大小写不敏感）
    # 与 .env.example 一一对应。（原实现 env_prefix="DB_" 会把期望名变成 DB_DB_*，与模板不符。）
    model_config = {"case_sensitive": False}

    @model_validator(mode="after")
    def _reject_missing_password(self):
        # pydantic-settings 会把未设置的必填 str 视为缺失并在实例化时抛错；
        # 这里再兜底空串/占位符，保证任何情况下都不会带默认口令连库。
        if not self.db_password or self.db_password in {
            "ChangeMe_Strong_123", "CHANGE_ME", "changeme", "password",
        }:
            raise ValueError(
                "DB_PASSWORD must be provided via environment and must not be a "
                "placeholder default. Refusing to start with an insecure credential."
            )
        return self


class AppSettings(BaseSettings):
    """非 DB 前缀的系统配置（设置页 token 等）。

    settings_token 无默认值：A1/A2 鉴权不在本次范围，但该字段仍属凭据，
    不再内置"看似真实"的占位口令；由环境变量 SETTINGS_TOKEN 注入，缺省为空串。
    """

    settings_token: str = ""

    model_config = {"case_sensitive": False}


try:
    settings = Settings()
except Exception as exc:  # noqa: BLE001 - 启动期需要最清晰的中止信号
    raise RuntimeError(
        "data-service configuration error: DB_PASSWORD is required and must not be "
        f"a default credential. Set the DB_PASSWORD environment variable. Details: {exc}"
    ) from exc

app_settings = AppSettings()

DSN = (
    f"postgres://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
)
