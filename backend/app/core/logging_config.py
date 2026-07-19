"""Structured JSON logging with request IDs and log rotation."""

import json
import logging
import logging.handlers
import uuid
from pathlib import Path
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class JSONFormatter(logging.Formatter):
    """Format log records as JSON with standard fields."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get() or "-",
            "module": record.module,
        }
        if record.exc_info and record.exc_info[1] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging(debug: bool = False):
    """Configure root logger with console and rotating file handlers."""
    level = logging.DEBUG if debug else logging.INFO

    root = logging.getLogger("shopmind")
    root.setLevel(level)
    root.handlers.clear()

    # Console handler
    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(JSONFormatter())
    root.addHandler(console)

    # Rotating file handler (10 MB max, 5 backups)
    # Use absolute path relative to project root (not CWD, which varies by launch dir)
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    log_dir = project_root / "logs"
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "shopmind.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(JSONFormatter())
    root.addHandler(file_handler)

    # Also configure uvicorn access log
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").addHandler(console)

    # Confirm logging is set up
    root.info("Logging initialized — writing to %s", log_dir / "shopmind.log")

    return root
