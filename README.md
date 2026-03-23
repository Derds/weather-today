# Weather Today 🌤️

A minimal command line interface to check the weather in your area with additional date and moon phase information.

## Features

- 🌡️ Current weather conditions
- 📅 Day of the month
- 📊 Week of the year
- 🌙 Phase of the moon
- 📍 Configurable location (defaults to London)
- 🎨 Nice visual display

## Installation

```bash
npm install
npm link
```

## Usage

Simply run:

```bash
weather
```

To check tides:

```bash
weather tides
```

The `weather` command displays:
- Current date (formatted nicely)
- Day of the month
- Week of the year
- Current moon phase
- Weather conditions for your configured location
- Temperature, feels like temperature, humidity, and wind speed

## Configuration

To change your default location and port, edit the `config.json` file:

```json
{
  "location": "Your City Name",
  "port": "Your Port Name"
}
```

Examples:
- `"location": "New York", "port": "New York Harbor"`
- `"location": "Tokyo", "port": "Tokyo"`
- `"location": "Paris", "port": "Le Havre"`

## API

This tool uses the free [Open-Meteo API](https://open-meteo.com/) for weather data - no API key required!

## Example Output

```
╔══════════════════════════════════════════════════╗
║           🌤️  WEATHER TODAY 🌤️                  ║
╚══════════════════════════════════════════════════╝

📅 Monday, March 23rd, 2026
📆 Day of month: 23
📊 Week of year: 13
🌙 Moon phase: 🌓 First Quarter

📍 Fetching weather for London...

┌─────────────────────────────────────────────────┐
│  Location: London, United Kingdom               │
├─────────────────────────────────────────────────┤
│  ⛅  Partly cloudy                               │
│  🌡️  Temperature: 12°C                          │
│  🤚 Feels like: 10°C                             │
│  💧 Humidity: 65%                                │
│  💨 Wind speed: 15 km/h                          │
└─────────────────────────────────────────────────┘

💡 Tip: Edit config.json to change your default location
```
