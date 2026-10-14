# TravelReality AI — Know Before You Go

**AI-powered destination intelligence and personalized travel decision support for travelers before they step out the door.**

---

## 1. Executive Summary & Product Vision

Tourists often plan trips using promotional photographs, influencer posts, and scattered reviews that omit critical ground realities: steep steps, unverified wheelchair access, closed interior chambers, long walking circuits, strict Friday closures, or electronic bans.

**TravelReality AI** solves this problem by providing evidence-grounded destination intelligence. Instead of merely answering *"What places look pretty?"*, the system answers:

> *"Considering my specific needs and verified data, what should I realistically expect if I visit this destination?"*

For every destination, TravelReality AI provides four clearly separated pillars:
1. **WHAT WE KNOW**: Destination attributes supported by identifiable official sources (ASI, Ministry of Tourism, Municipal Records) and verification timestamps.
2. **HOW WELL IT MATCHES YOU**: Personalized evaluation explaining how known characteristics match your walking intensity, accessibility needs, time window, and interests.
3. **WHAT COULD BE DIFFICULT**: Identified mismatches, steep stairs, lack of elevators, excessive walking distances, or confirmed seasonal disruptions.
4. **WHAT TO VERIFY BEFORE LEAVING**: A practical pre-departure checklist based on unconfirmed or date-sensitive conditions.

---

## 2. Architecture & Tech Stack

```
travelreality-ai/
├── backend/
│   ├── app.py                # FastAPI REST API endpoints & static serving
│   ├── models.py             # Pydantic v2 schemas for Profile, Reality Check & Reports
│   ├── engine.py             # Explainable Suitability Engine & Alternatives Generator
│   ├── gemini_service.py     # Dual-mode AI synthesis (Google Gemini + Deterministic Fallback)
│   ├── weather_service.py    # Open-Meteo meteorological integration (real-time + 7-day forecast)
│   └── data/
│       ├── destinations.json # Grounded factual dataset (India & International)
│       └── reports.json      # Community observations & moderation store
├── static/
│   ├── index.html            # Single-page web app with responsive modern UI
│   ├── css/
│   │   └── custom.css        # Accessible focus rings, animations, print styling
│   └── js/
│       ├── api.js            # Frontend REST API client
│       ├── state.js          # Reactive store with localStorage persistence
│       ├── components.js     # UI renderers for cards, reality check, comparison, & reports
│       └── app.js            # App controller, event handlers, and modals
├── tests/
│   ├── test_engine.py        # Unit tests for scoring logic, hard constraints & fallbacks
│   └── test_api.py           # Integration tests for FastAPI endpoints
├── run.py                    # One-click launcher script
└── README.md                 # Complete documentation
```

### Key Technical Decisions:
- **Backend**: Python 3.13, **FastAPI**, **Pydantic v2**, **Uvicorn**, **HTTPX**.
- **Frontend**: Vanilla ES6+ modules, **Tailwind CSS**, accessible HTML5 semantic layout.
- **Weather API**: **Open-Meteo API** (Free, open-access, zero API key required, latitude/longitude based).
- **AI Engine**: Modular **Google Gemini API** (`gemini-2.5-flash` / `gemini-1.5-flash`) with a transparent, fully deterministic offline fallback engine that runs when no key is supplied.
- **Privacy First**: Sensitive traveler preferences are stored in `localStorage` on the client device only; zero personal telemetry is transmitted.

---

## 3. Core Features Walkthrough

### Feature 1: Modern Landing Page
- Headline: *"Know Before You Go."*
- Interactive search interface and category discovery.
- Explains the 4 Core Pillars of destination reality checking.
- Example destination cards showcasing verification completeness scores.

### Feature 2: Destination Discovery
- Multi-dimensional search by monument name, city, state, or tags.
- Filtering by categories: Historical & Heritage, Nature & Outdoor, Cultural & Spiritual, City Experiences.
- Quick filter toggles: **Step-Free Accessible Only**, **Minimal Walking**, and sorting by Data Verification Completeness or Visit Duration.

### Feature 3: Personalized Travel Profile
- Interactive questionnaire saved locally:
  - Available visit time (1 to 12 hours)
  - Preferred walking intensity (Minimal <1 km, Moderate 1-3 km, High 3+ km)
  - **Mandatory Step-Free Access** (Strict constraint)
  - Minimize stairs toggle
  - Traveling with children
  - Slower-paced / Senior traveler considerations
  - Budget tier & primary interests

### Feature 4: Destination Reality Check (The Central Differentiator)
- Dedicated view with:
  - **Data Completeness Meter** (Calculated based on confirmed facts vs unknowns).
  - **Explainable Suitability Score** with color-coded status badge.
  - **Pillar A: What We Know** (Hours, ticket fees, walking distance, accessibility audit, transit).
  - **Pillar B: How Well It Matches You** (Specific match rationale).
  - **Pillar C: What Could Be Difficult** (Cautions, steps, heat, unverified elevators).
  - **Pillar D: What To Verify Before Leaving** (Interactive checklist with check-off capability).

### Feature 5: Explainable Suitability Engine
- Avoids arbitrary AI percentage guesses.
- Hard requirements (e.g. `step_free_required`) strictly penalize venues with unavoidable stairs (e.g. Hampi receives a 5/100 *High Mismatch Risk*).
- Soft preferences adjust score transparently with factor-by-factor breakdown.
- Separate calculation of **Data Completeness** vs **Personal Suitability**.

### Feature 6: Dual-Mode AI Synthesis (Gemini + Deterministic Fallback)
- **Live Gemini AI Mode**: When a user inputs their Gemini API key in Settings, the system queries Gemini with grounded destination facts and prompt constraints against hallucination.
- **Deterministic Rule Mode**: When no key is provided or the device is offline, the system runs its deterministic rule synthesizer, clearly labeled as *"Deterministic Rule-Based Assessment (Verified)"*.

### Feature 7: Side-by-Side Destination Comparison
- Compare up to 3 destinations side-by-side.
- Highlights user-critical rows (e.g. accessibility, walking distance, duration).
- Displays clear *"Unverified"* badges when data is missing rather than guessing.

### Feature 8: Grounded Alternative Destinations
- When a destination presents mobility barriers or high constraints, the system automatically suggests verified alternatives with comparative advantages.

### Feature 9: Real-Time Conditions & Open-Meteo Weather
- Connects to Open-Meteo using destination coordinates (`latitude`, `longitude`).
- Displays live temperature, apparent temperature, humidity, wind speed, condition, and 7-day forecast.
- Alerts user if the visit date exceeds the 7-day meteorological forecast horizon.

### Feature 10: Community Condition Reporting & Admin Moderation
- Allows users to report unexpected obstacles, temporary closures, or elevator breakdowns.
- Submissions are initially marked as `unverified` to preserve factual integrity.
- Built-in **Admin Moderation Mode** allows instant review, verification, or rejection of reports.

---

## 4. How to Run

### Prerequisites
- Python 3.10+ (Python 3.13 tested)

### 1. Launch Server
From the project directory:
```bash
python run.py
```
Or directly with Uvicorn:
```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Access the Application
Open your web browser and navigate to:
```
http://127.0.0.1:8000
```

---

## 5. Running the Automated Test Suite

### Run Suitability Engine Tests:
```powershell
$env:PYTHONPATH="."
python tests/test_engine.py
```

### Run API Integration Tests:
```powershell
$env:PYTHONPATH="."
python tests/test_api.py
```

---

## 6. Factual Dataset & Sources
Every destination in the dataset contains real coordinates, official sources, and audited accessibility notes:
- **Taj Mahal, Agra**: ASI official hours, TTZ electric shuttle rules, marble plinth steps vs ramp access.
- **Qutub Minar, New Delhi**: Level lawn paths, ramped monument circuit, minar interior closed since 1981.
- **Meenakshi Amman Temple, Madurai**: High Court mobile phone ban, granite thresholds, barefoot stone prakarams.
- **Hampi Ruins, Karnataka**: Vast 41 sq km open-air terrain, rugged boulder climbs, extreme heat notice.
- **Kumarakom & Kerala Backwaters**: Level sanctuary boardwalks, licensed houseboat boarding gangways.
- **Amber Fort, Jaipur**: Hilltop jeep bypass vs steep cobblestone ramp, courtyards with stepped halls.
- **Mysore Palace, Mysuru**: Verified passenger elevator to Durbar Hall for mobility-impaired visitors.
- **Victoria Memorial, Kolkata**: North Gate ramp, hydraulic elevator to Prince Hall galleries.
- **Pangong Tso, Ladakh**: Mandatory 48h Leh acclimatization, altitude sickness warning, gravel shores.
- **Musée du Louvre, Paris**: Timed online reservation mandate, 18 elevators & wheelchair lifts across 3 wings.
- **Sensō-ji Temple, Tokyo**: Barrier-free approach, Hondo hall exterior glass elevator.
