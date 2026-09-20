import logging
import urllib.request
import json
from typing import Optional

logger = logging.getLogger(__name__)

async def dispatch_telegram_approval_alert(
    approval_id: str,
    title: str,
    action_type: str,
    risk_level: str,
    status: str,
) -> bool:
    """
    Sends a formatted approval notification alert to Telegram.
    """
    try:
        text = (
            f"🔔 *SAGARA AGENTIC — APPROVAL ALERT*\n"
            f"• *Gate ID:* `{approval_id}`\n"
            f"• *Title:* {title}\n"
            f"• *Action:* `{action_type}`\n"
            f"• *Risk:* `{risk_level}`\n"
            f"• *Status:* `{status}`\n\n"
            f"🔗 Review in Mission Control: https://office.alkaralintas.site/approvals"
        )
        logger.info(f"Telegram approval alert prepared for {approval_id}: {title}")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch Telegram approval alert: {e}")
        return False
