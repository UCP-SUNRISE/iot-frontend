# SUNRISE Project: IoT Frontend Application

## 🎯 Overview
This repository contains the frontend user interface for the **SUNRISE** research project. It is a telemetry dashboard and management tool designed to monitor and configure a network of solar ovens. 

The application interfaces directly with a local Raspberry Pi Edge Server via MQTT, displaying real-time data gathered from ESP32 sensor firmwares.

## 🛠 Technology Stack
* **Framework:** Next.js 16 (App Router)
* **UI/Styling:** Shadcn UI + Tailwind CSS
* **Authentication:** Auth0 v4 (`@auth0/nextjs-auth0`)
* **State Management:** React Context (Optimized for real-time telemetry)
* **IoT Protocol:** MQTT over WebSockets (WSS) via `mqtt.js`

## 🌍 Hybrid Deployment Architecture
Due to the strict firewall and port restrictions of the university's Eduroam network, the system operates under a dual-deployment strategy. This ensures the application remains accessible globally while maintaining an offline-capable edge fallback.

### 1. Cloud Mode (Vercel)
* The primary dashboard is deployed via Vercel.
* **Data Flow:** The web app connects securely to the Edge Server using an HTTPS/WSS tunnel (e.g., Ngrok) that exposes the Raspberry Pi's Mosquitto broker.
* **Authentication:** Standard Auth0 cloud authentication via the Next.js proxy middleware.

### 2. Edge / Offline Mode (Raspberry Pi)
* A production standalone build of this Next.js application runs directly on the local Raspberry Pi Edge Server.
* **Data Flow:** Researchers connected to the local Eduroam LAN access the dashboard via the Pi's local IP. The frontend connects directly to the local Mosquitto WebSockets port (`ws://localhost:9001` or local IP).
* **Resilience:** If the external internet fails, this local instance continues to visualize oven telemetry without disruption.

## 🔐 Authentication & Offline Strategy
This application utilizes **Auth0 v4**, leveraging the proxy middleware (`src/proxy.ts`) to auto-mount authentication routes (`/auth/login`, `/auth/logout`, `/auth/callback`).

**Edge Offline Bypass:** Because Auth0 requires an active internet connection to validate sessions, the application implements an offline authentication fallback. When running in Edge mode without external internet access, the system bypasses the Auth0 proxy and relies on a localized PIN/token mechanism to grant access to physically present researchers.

## 📡 State Management & Data Flow
To handle high-frequency sensor telemetry without causing unnecessary UI re-renders, the application isolates real-time data streams using React Context.

* **MQTT Provider:** An `MqttProvider` context manages the `mqtt.js` client connection lifecycle, handles dynamic broker URLs (Ngrok vs. Localhost), and manages auto-reconnection logic.
* Subscribed components (like the Dashboard charts) consume this context to display the latest oven temperatures and system statuses in real-time.

## 📂 Core Features & Application Structure

* **Dashboard (`/dashboard`)**
  Real-time visualization of solar oven metrics across the entire fleet, including current temperatures and network connection statuses.

* **Experiments & Projects (`/projects`)**
  The central hub for managing distinct research phases. Each project page contains:
  * **Configuration:** Setup details for specific test runs.
  * **Alerts & Thresholds:** Defined temperature boundaries (e.g., > 180°C) and a historical log of threshold breaches specific to that experiment.
  * **Data Export:** Telemetry download utility. *Note for developers: CSV exports must be generated using semicolons (`;`) as delimiters to ensure seamless column separation natively in Portuguese distributions of Excel.*

* **Device Management (`/devices`)**
  Hardware lifecycle operations. Interfaces for registering new ESP32 MAC addresses, monitoring Wi-Fi signal strength (RSSI) and firmware versions, and applying software-level calibration offsets to individual temperature sensors.

* **Audit Logs (`/logs`)**
  A security and accountability ledger tracking system configuration changes. This logs which authenticated researcher modified thresholds, altered calibration offsets, or provisioned new devices.

* **Settings (`/settings`)**
  Configuration page to update dynamic environment variables (e.g., refreshing the Ngrok tunnel URL after an Edge Server reboot) and manage global MQTT topics.
