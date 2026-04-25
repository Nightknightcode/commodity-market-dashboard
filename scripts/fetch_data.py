from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "commodities.json"
SINGAPORE_TZ = ZoneInfo("Asia/Singapore")

COMMODITIES: dict[str, dict[str, str]] = {
    "aluminium": {
        "name": "Aluminium",
        "ticker": "ALI=F",
        "display_symbol": "ALI=F",
        "unit": "USD / tonne",
        "color": "#38bdf8",
    },
    "brent_crude": {
        "name": "Brent Crude",
        "ticker": "BZ=F",
        "display_symbol": "BZ=F",
        "unit": "USD / barrel",
        "color": "#f59e0b",
    },
    "copper": {
        "name": "Copper",
        "ticker": "HG=F",
        "display_symbol": "HG=F",
        "unit": "USD / lb",
        "color": "#fb7185",
    },
    "steel_hrc": {
        "name": "Steel HRC",
        "ticker": "HRC=F",
        "display_symbol": "HRC=F",
        "unit": "USD / short ton",
        "color": "#34d399",
    },
}


def empty_commodity(config: dict[str, str]) -> dict[str, Any]:
    return {
        "name": config["name"],
        "ticker": config["display_symbol"],
        "unit": config["unit"],
        "color": config["color"],
        "observations": 0,
        "start_date": None,
        "end_date": None,
        "prices": [],
    }


def extract_close_series(frame: pd.DataFrame, ticker: str) -> pd.Series:
    if frame.empty:
        raise ValueError("No rows returned by yfinance.")

    if isinstance(frame.columns, pd.MultiIndex):
        for level in range(frame.columns.nlevels):
            values = frame.columns.get_level_values(level)
            if "Close" not in values:
                continue

            close_data = frame.xs("Close", axis=1, level=level, drop_level=True)
            if isinstance(close_data, pd.Series):
                return close_data
            if ticker in close_data.columns:
                return close_data[ticker]
            if len(close_data.columns):
                return close_data.iloc[:, 0]

        raise ValueError("Could not locate Close column in MultiIndex response.")

    if "Close" not in frame.columns:
        raise ValueError("Could not locate Close column in response.")

    close_series = frame["Close"]
    if isinstance(close_series, pd.DataFrame):
        if ticker in close_series.columns:
            return close_series[ticker]
        return close_series.iloc[:, 0]
    return close_series


def point_timestamp_ms(date_text: str) -> int:
    return int(pd.Timestamp(date_text, tz="UTC").timestamp() * 1000)


def fetch_commodity(config: dict[str, str]) -> dict[str, Any]:
    ticker = config["ticker"]
    frame = yf.download(
        ticker,
        period="5y",
        interval="1d",
        auto_adjust=False,
        progress=False,
        threads=False,
    )
    close = extract_close_series(frame, ticker)
    close = pd.to_numeric(close, errors="coerce").dropna().sort_index()

    prices = []
    for index, value in close.items():
        date_text = pd.Timestamp(index).date().isoformat()
        prices.append(
            {
                "date": date_text,
                "timestamp": point_timestamp_ms(date_text),
                "close": round(float(value), 6),
            }
        )

    if not prices:
        raise ValueError("No valid close prices returned by yfinance.")

    return {
        "name": config["name"],
        "ticker": config["display_symbol"],
        "unit": config["unit"],
        "color": config["color"],
        "observations": len(prices),
        "start_date": prices[0]["date"],
        "end_date": prices[-1]["date"],
        "prices": prices,
    }


def build_payload() -> dict[str, Any]:
    payload: dict[str, Any] = {
        "generated_at": datetime.now(SINGAPORE_TZ).isoformat(timespec="seconds"),
        "source": "Yahoo Finance via scheduled GitHub Actions",
        "commodities": {},
        "errors": {},
    }

    for key, config in COMMODITIES.items():
        try:
            payload["commodities"][key] = fetch_commodity(config)
        except Exception as exc:  # noqa: BLE001 - keep other tickers updating.
            payload["commodities"][key] = empty_commodity(config)
            payload["errors"][key] = str(exc)

    return payload


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = build_payload()
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
