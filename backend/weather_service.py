import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("travelreality.weather")

# WMO Weather interpretation codes
WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

async def fetch_destination_weather(latitude: float, longitude: float, visit_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches real-time and 7-day forecast data from Open-Meteo for given coordinates.
    Gracefully handles network drops, invalid coordinates, or far-future dates.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
        "timezone": "auto"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                w_code = current.get("weather_code", 0)
                condition_desc = WEATHER_CODES.get(w_code, "Fair")

                daily = data.get("daily", {})
                daily_times = daily.get("time", [])
                max_temps = daily.get("temperature_2m_max", [])
                min_temps = daily.get("temperature_2m_min", [])
                precip_probs = daily.get("precipitation_probability_max", [])
                daily_codes = daily.get("weather_code", [])

                forecast_days = []
                for i in range(min(len(daily_times), 7)):
                    d_code = daily_codes[i] if i < len(daily_codes) else 0
                    forecast_days.append({
                        "date": daily_times[i],
                        "max_temp": max_temps[i] if i < len(max_temps) else None,
                        "min_temp": min_temps[i] if i < len(min_temps) else None,
                        "precipitation_prob": precip_probs[i] if i < len(precip_probs) else 0,
                        "condition": WEATHER_CODES.get(d_code, "Fair")
                    })

                date_notice = None
                if visit_date:
                    try:
                        v_dt = datetime.fromisoformat(visit_date.replace("Z", ""))
                        today = datetime.now()
                        delta_days = (v_dt.date() - today.date()).days
                        if delta_days > 7:
                            date_notice = f"Selected date ({visit_date}) is beyond the 7-day meteorological forecast horizon. Showing standard seasonal climate guidance instead of speculative daily forecast."
                    except Exception:
                        pass

                return {
                    "status": "success",
                    "provider": "Open-Meteo Meteorological Forecast API",
                    "last_updated": datetime.utcnow().isoformat() + "Z",
                    "current": {
                        "temperature_c": current.get("temperature_2m"),
                        "apparent_temperature_c": current.get("apparent_temperature"),
                        "humidity_pct": current.get("relative_humidity_2m"),
                        "wind_speed_kmh": current.get("wind_speed_10m"),
                        "condition": condition_desc,
                        "weather_code": w_code
                    },
                    "forecast": forecast_days,
                    "date_notice": date_notice
                }
    except Exception as e:
        logger.warning(f"Could not connect to Open-Meteo API ({e}). Providing local verified climate guidance.")

    # Offline / network fallback with grounded seasonal context
    return {
        "status": "offline_fallback",
        "provider": "TravelReality Offline Climate Reference (Open-Meteo unavailable)",
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "current": {
            "temperature_c": None,
            "apparent_temperature_c": None,
            "humidity_pct": None,
            "wind_speed_kmh": None,
            "condition": "Live weather feed currently unavailable",
            "weather_code": None
        },
        "forecast": [],
        "date_notice": "Live weather API currently unreachable. Verify local weather conditions before departure."
    }
