"""
Weather Service Module for WayWise AI.
Provides real-time and 7-day meteorological forecast data via Open-Meteo API
with in-memory TTL caching for optimal efficiency and network minimization.
"""

import time
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import httpx

logger = logging.getLogger("waywise.weather")

# WMO Weather interpretation codes
WEATHER_CODES: Dict[int, str] = {
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

# In-memory TTL Cache: (rounded_lat, rounded_lon) -> (timestamp, data)
# Cache duration: 15 minutes (900 seconds)
_WEATHER_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}
_CACHE_TTL_SECONDS: float = 900.0

def get_cached_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Retrieve unexpired weather data from memory cache if available."""
    key = (round(lat, 3), round(lon, 3))
    if key in _WEATHER_CACHE:
        timestamp, data = _WEATHER_CACHE[key]
        if time.time() - timestamp < _CACHE_TTL_SECONDS:
            logger.debug("Weather cache hit for %s", key)
            cached_copy = dict(data)
            cached_copy["cache_hit"] = True
            return cached_copy
        else:
            del _WEATHER_CACHE[key]
    return None

def set_cached_weather(lat: float, lon: float, data: Dict[str, Any]) -> None:
    """Store fresh weather response in memory cache."""
    key = (round(lat, 3), round(lon, 3))
    # Cap cache size to prevent memory bloat
    if len(_WEATHER_CACHE) > 500:
        _WEATHER_CACHE.clear()
    _WEATHER_CACHE[key] = (time.time(), data)

async def fetch_destination_weather(
    latitude: float,
    longitude: float,
    visit_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetches real-time and 7-day forecast data from Open-Meteo for given coordinates.
    Employs an in-memory TTL cache to minimize external network requests.
    Gracefully handles network drops, invalid coordinates, or dates beyond forecast range.
    """
    # Check cache first for high efficiency
    cached = get_cached_weather(latitude, longitude)
    if cached:
        return cached

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
                            date_notice = (
                                f"Selected visit date ({visit_date}) is beyond the 7-day meteorological "
                                f"forecast horizon. Showing current seasonal reference."
                            )
                    except Exception:
                        pass

                result = {
                    "status": "success",
                    "provider": "Open-Meteo Meteorological Forecast API",
                    "last_updated": datetime.utcnow().isoformat() + "Z",
                    "cache_hit": False,
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

                # Save to cache
                set_cached_weather(latitude, longitude, result)
                return result
    except Exception as e:
        logger.warning("Could not connect to Open-Meteo API (%s). Falling back to offline climate reference.", e)

    # Offline fallback response
    return {
        "status": "offline_fallback",
        "provider": "WayWise Offline Climate Reference (Open-Meteo currently unreachable)",
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "cache_hit": False,
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
