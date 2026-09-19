import sqlite3
from typing import Any, Optional
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics


class UsageReader:
    """
    Reads model and token usage evidence from Hermes SQLite `session_model_usage` and `sessions`.
    Enforces strict UNKNOWN != ZERO semantics for costs and token counters.
    """

    def __init__(
        self,
        db: HermesReadOnlyDatabase,
        diagnostics: Optional[HermesRuntimeDiagnostics] = None,
    ) -> None:
        self._db = db
        self._diagnostics = diagnostics

    async def get_usage_for_profile_sessions(self, session_ids: list[str]) -> Optional[dict[str, Any]]:
        """Aggregates usage across a list of session IDs for an agent profile."""
        if not session_ids:
            return None

        def _read(conn: sqlite3.Connection) -> Optional[dict[str, Any]]:
            cur = conn.cursor()
            # Check if session_model_usage exists
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='session_model_usage';")
            has_usage_table = bool(cur.fetchone())

            if has_usage_table:
                placeholders = ",".join("?" for _ in session_ids)
                query = f"""
                    SELECT 
                        SUM(input_tokens) AS total_input,
                        SUM(output_tokens) AS total_output,
                        SUM(estimated_cost_usd) AS total_est_cost,
                        SUM(actual_cost_usd) AS total_act_cost,
                        COUNT(actual_cost_usd) AS count_act_cost,
                        COUNT(input_tokens) AS count_input
                    FROM session_model_usage
                    WHERE session_id IN ({placeholders});
                """
                cur.execute(query, session_ids)
                row = cur.fetchone()
                if row and (row["count_input"] or 0) > 0:
                    return {
                        "input_tokens": int(row["total_input"]) if row["total_input"] is not None else None,
                        "output_tokens": int(row["total_output"]) if row["total_output"] is not None else None,
                        "estimated_cost_usd": float(row["total_est_cost"]) if row["total_est_cost"] is not None else None,
                        "actual_cost_usd": float(row["total_act_cost"]) if row["count_act_cost"] > 0 and row["total_act_cost"] is not None else None,
                    }

            # Fallback to sessions table summary columns if session_model_usage has no records for these
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if cur.fetchone():
                placeholders = ",".join("?" for _ in session_ids)
                query = f"""
                    SELECT 
                        SUM(input_tokens) AS total_input,
                        SUM(output_tokens) AS total_output,
                        SUM(estimated_cost_usd) AS total_est_cost,
                        SUM(actual_cost_usd) AS total_act_cost,
                        COUNT(actual_cost_usd) AS count_act_cost,
                        COUNT(input_tokens) AS count_input
                    FROM sessions
                    WHERE id IN ({placeholders});
                """
                cur.execute(query, session_ids)
                row = cur.fetchone()
                if row and (row["count_input"] or 0) > 0:
                    return {
                        "input_tokens": int(row["total_input"]) if row["total_input"] is not None else None,
                        "output_tokens": int(row["total_output"]) if row["total_output"] is not None else None,
                        "estimated_cost_usd": float(row["total_est_cost"]) if row["total_est_cost"] is not None else None,
                        "actual_cost_usd": float(row["total_act_cost"]) if row["count_act_cost"] > 0 and row["total_act_cost"] is not None else None,
                    }

            return None

        return await self._db.execute_read(_read)

    async def get_all_profiles_usage_map(self) -> dict[str, dict[str, Any]]:
        """Aggregates usage grouped by profile_name from sessions and session_model_usage."""
        def _read(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if not cur.fetchone():
                return {}

            query = """
                SELECT 
                    profile_name,
                    SUM(input_tokens) AS total_input,
                    SUM(output_tokens) AS total_output,
                    SUM(estimated_cost_usd) AS total_est_cost,
                    SUM(actual_cost_usd) AS total_act_cost,
                    COUNT(actual_cost_usd) AS count_act_cost,
                    COUNT(input_tokens) AS count_input
                FROM sessions
                WHERE profile_name IS NOT NULL AND profile_name != ''
                GROUP BY profile_name;
            """
            cur.execute(query)
            rows = cur.fetchall()
            result: dict[str, dict[str, Any]] = {}
            for r in rows:
                pname = r["profile_name"]
                if (r["count_input"] or 0) > 0:
                    result[pname] = {
                        "input_tokens": int(r["total_input"]) if r["total_input"] is not None else None,
                        "output_tokens": int(r["total_output"]) if r["total_output"] is not None else None,
                        "estimated_cost_usd": float(r["total_est_cost"]) if r["total_est_cost"] is not None else None,
                        "actual_cost_usd": float(r["total_act_cost"]) if r["count_act_cost"] > 0 and r["total_act_cost"] is not None else None,
                    }
            return result

        return await self._db.execute_read(_read)

    async def get_runtime_usage_overview(self) -> dict[str, Any]:
        """Aggregates overall usage telemetry and breakdowns by profile, model, and provider."""
        def _read(conn: sqlite3.Connection) -> dict[str, Any]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if not cur.fetchone():
                return {
                    "totalApiCalls": 0,
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "reasoningTokens": 0,
                    "cacheTokens": 0,
                    "estimatedCostUsd": 0.0,
                    "actualCostUsd": None,
                    "byAgent": [],
                    "byModel": [],
                    "byProvider": [],
                }

            cur.execute("""
                SELECT 
                    SUM(api_call_count) AS total_calls,
                    SUM(input_tokens) AS total_input,
                    SUM(output_tokens) AS total_output,
                    SUM(reasoning_tokens) AS total_reasoning,
                    SUM(cache_read_tokens) AS total_cache,
                    SUM(estimated_cost_usd) AS total_est_cost,
                    SUM(actual_cost_usd) AS total_act_cost,
                    COUNT(actual_cost_usd) AS count_act_cost
                FROM sessions;
            """)
            r = cur.fetchone()
            total_calls = int(r["total_calls"]) if r and r["total_calls"] is not None else 0
            input_tokens = int(r["total_input"]) if r and r["total_input"] is not None else 0
            output_tokens = int(r["total_output"]) if r and r["total_output"] is not None else 0
            reasoning_tokens = int(r["total_reasoning"]) if r and r["total_reasoning"] is not None else 0
            cache_tokens = int(r["total_cache"]) if r and r["total_cache"] is not None else 0
            est_cost = float(r["total_est_cost"]) if r and r["total_est_cost"] is not None else 0.0
            act_cost = float(r["total_act_cost"]) if r and r["count_act_cost"] > 0 and r["total_act_cost"] is not None else None

            # By Profile / Agent
            cur.execute("""
                SELECT 
                    COALESCE(profile_name, 'default') AS name,
                    SUM(api_call_count) AS calls,
                    SUM(input_tokens) AS inp,
                    SUM(output_tokens) AS out,
                    SUM(reasoning_tokens) AS reas,
                    SUM(cache_read_tokens) AS cache,
                    SUM(estimated_cost_usd) AS est,
                    SUM(actual_cost_usd) AS act,
                    COUNT(actual_cost_usd) AS count_act
                FROM sessions
                GROUP BY name;
            """)
            by_agent = [
                {
                    "name": row["name"],
                    "apiCalls": int(row["calls"]) if row["calls"] is not None else 0,
                    "inputTokens": int(row["inp"]) if row["inp"] is not None else 0,
                    "outputTokens": int(row["out"]) if row["out"] is not None else 0,
                    "reasoningTokens": int(row["reas"]) if row["reas"] is not None else 0,
                    "cacheTokens": int(row["cache"]) if row["cache"] is not None else 0,
                    "estimatedCostUsd": float(row["est"]) if row["est"] is not None else 0.0,
                    "actualCostUsd": float(row["act"]) if row["count_act"] > 0 and row["act"] is not None else None,
                }
                for row in cur.fetchall()
            ]

            # By Model
            cur.execute("""
                SELECT 
                    COALESCE(model, 'unknown') AS name,
                    SUM(api_call_count) AS calls,
                    SUM(input_tokens) AS inp,
                    SUM(output_tokens) AS out,
                    SUM(reasoning_tokens) AS reas,
                    SUM(cache_read_tokens) AS cache,
                    SUM(estimated_cost_usd) AS est,
                    SUM(actual_cost_usd) AS act,
                    COUNT(actual_cost_usd) AS count_act
                FROM sessions
                GROUP BY name;
            """)
            by_model = [
                {
                    "name": row["name"],
                    "apiCalls": int(row["calls"]) if row["calls"] is not None else 0,
                    "inputTokens": int(row["inp"]) if row["inp"] is not None else 0,
                    "outputTokens": int(row["out"]) if row["out"] is not None else 0,
                    "reasoningTokens": int(row["reas"]) if row["reas"] is not None else 0,
                    "cacheTokens": int(row["cache"]) if row["cache"] is not None else 0,
                    "estimatedCostUsd": float(row["est"]) if row["est"] is not None else 0.0,
                    "actualCostUsd": float(row["act"]) if row["count_act"] > 0 and row["act"] is not None else None,
                }
                for row in cur.fetchall()
            ]

            # By Provider
            cur.execute("""
                SELECT 
                    COALESCE(billing_provider, 'default') AS name,
                    SUM(api_call_count) AS calls,
                    SUM(input_tokens) AS inp,
                    SUM(output_tokens) AS out,
                    SUM(reasoning_tokens) AS reas,
                    SUM(cache_read_tokens) AS cache,
                    SUM(estimated_cost_usd) AS est,
                    SUM(actual_cost_usd) AS act,
                    COUNT(actual_cost_usd) AS count_act
                FROM sessions
                GROUP BY name;
            """)
            by_provider = [
                {
                    "name": row["name"],
                    "apiCalls": int(row["calls"]) if row["calls"] is not None else 0,
                    "inputTokens": int(row["inp"]) if row["inp"] is not None else 0,
                    "outputTokens": int(row["out"]) if row["out"] is not None else 0,
                    "reasoningTokens": int(row["reas"]) if row["reas"] is not None else 0,
                    "cacheTokens": int(row["cache"]) if row["cache"] is not None else 0,
                    "estimatedCostUsd": float(row["est"]) if row["est"] is not None else 0.0,
                    "actualCostUsd": float(row["act"]) if row["count_act"] > 0 and row["act"] is not None else None,
                }
                for row in cur.fetchall()
            ]

            return {
                "totalApiCalls": total_calls,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "reasoningTokens": reasoning_tokens,
                "cacheTokens": cache_tokens,
                "estimatedCostUsd": est_cost,
                "actualCostUsd": act_cost,
                "byAgent": by_agent,
                "byModel": by_model,
                "byProvider": by_provider,
            }

        return await self._db.execute_read(_read)
