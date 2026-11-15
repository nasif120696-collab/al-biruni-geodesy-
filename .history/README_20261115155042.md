# Al-Biruni Geodesy — Orbital Wildfire Telemetry & Sensor Harmonization

Built for the **NASA Space Apps Challenge 2026** (*Harmonization of MODIS and VIIRS Hot Spots*).

## Overview
- **Raw Satellite Observations:** `21,414,156` detections across MODIS Collection 6.1 (1 km) and VIIRS C2 (375 m — Suomi-NPP, NOAA-20/J1, NOAA-21/J2) from `2025-11-14` to `2026-11-14`.
- **Harmonized Wildfire Events:** `1,131,049` verified clusters using a **1.5 km spherical chord-distance** & **6-hour overpass window** (`94.7%` duplicate clutter cut, `173,642` cross-sensor confirmed)[cite: 21].
- **26-Year Burning Calendar (2001–2026):** Sensor-calibrated Month × Year burning days across Bangladesh (Sundarbans & Croplands), California, Amazon, and Australia with `>2 SD` anomaly detection.

## Setup & Run
1. Copy `global_harmonized_2.json` into `public/global_harmonized_2.json`[cite: 21].
2. Copy your team banner image into `public/banner.png`[cite: 20].
3. Install dependencies and start the server:
   ```bash
   npm install
   npm run dev