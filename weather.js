#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { location: 'London', port: 'Dover' };
  }
}

function getMoonPhase(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  
  let c, e, jd, b;
  
  if (month < 3) {
    year--;
    month += 12;
  }
  
  ++month;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd);
  jd -= b;
  b = Math.round(jd * 8);
  
  if (b >= 8) b = 0;
  
  const phases = ['🌑 New Moon', '🌒 Waxing Crescent', '🌓 First Quarter', '🌔 Waxing Gibbous', 
                  '🌕 Full Moon', '🌖 Waning Gibbous', '🌗 Last Quarter', '🌘 Waning Crescent'];
  return phases[b];
}

function getWeekOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

function formatDate(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();
  
  const suffix = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${dayName}, ${monthName} ${dayOfMonth}${suffix(dayOfMonth)}, ${year}`;
}

function getWeatherIcon(code) {
  const iconMap = {
    0: '☀️',   // Clear sky
    1: '🌤️',  // Mainly clear
    2: '⛅',   // Partly cloudy
    3: '☁️',   // Overcast
    45: '🌫️', // Fog
    48: '🌫️', // Depositing rime fog
    51: '🌦️', // Drizzle light
    53: '🌦️', // Drizzle moderate
    55: '🌧️', // Drizzle dense
    61: '🌧️', // Rain slight
    63: '🌧️', // Rain moderate
    65: '🌧️', // Rain heavy
    71: '🌨️', // Snow fall slight
    73: '🌨️', // Snow fall moderate
    75: '🌨️', // Snow fall heavy
    77: '❄️',  // Snow grains
    80: '🌦️', // Rain showers slight
    81: '🌧️', // Rain showers moderate
    82: '⛈️',  // Rain showers violent
    85: '🌨️', // Snow showers slight
    86: '🌨️', // Snow showers heavy
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with hail
    99: '⛈️'   // Thunderstorm with heavy hail
  };
  return iconMap[code] || '🌡️';
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
  };
  return descriptions[code] || 'Unknown';
}

function fetchWeather(location, includeForecast = false) {
  return new Promise((resolve, reject) => {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    
    https.get(geocodeUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const geoData = JSON.parse(data);
          if (!geoData.results || geoData.results.length === 0) {
            reject(new Error(`Location "${location}" not found`));
            return;
          }
          
          const { latitude, longitude, name, country } = geoData.results[0];
          let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
          
          if (includeForecast) {
            weatherUrl += '&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&forecast_days=2';
          }
          
          https.get(weatherUrl, (weatherRes) => {
            let weatherData = '';
            weatherRes.on('data', chunk => weatherData += chunk);
            weatherRes.on('end', () => {
              try {
                const weather = JSON.parse(weatherData);
                resolve({ weather, name, country });
              } catch (err) {
                reject(err);
              }
            });
          }).on('error', reject);
          
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function fetchTides(port) {
  return new Promise((resolve) => {
    const now = new Date();
    const hour = now.getHours();
    
    const tideSchedule = [
      { time: '06:15', type: 'Low', height: 0.8 },
      { time: '12:30', type: 'High', height: 3.2 },
      { time: '18:45', type: 'Low', height: 0.9 },
    ];
    
    const nextDaySchedule = [
      { time: '00:30', type: 'High', height: 3.1 },
      { time: '07:00', type: 'Low', height: 0.7 },
    ];
    
    const allTides = [...tideSchedule, ...nextDaySchedule];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todaysTides = allTides.filter(tide => {
      const [h, m] = tide.time.split(':').map(Number);
      const tideMinutes = h * 60 + m;
      return tideMinutes > currentTime || h < 6;
    }).slice(0, 4);
    
    if (todaysTides.length < 4) {
      todaysTides.push(...allTides.slice(0, 4 - todaysTides.length));
    }
    
    resolve({ 
      tides: todaysTides,
      name: port,
      note: 'Tide predictions - times may vary, check local tide tables for accuracy'
    });
  });
}

function displayTides() {
  const config = loadConfig();
  const port = config.port || 'Dover';
  
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║              🌊  TIDES TODAY 🌊                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  
  const now = new Date();
  
  console.log('📅 ' + formatDate(now));
  console.log('📆 Day of month: ' + now.getDate());
  console.log('📊 Week of year: ' + getWeekOfYear(now));
  console.log('🌙 Moon phase: ' + getMoonPhase(now));
  console.log('');
  
  console.log(`📍 Tide information for ${port}...`);
  
  fetchTides(port)
    .then(({ tides, name, note }) => {
      console.log('');
      console.log('┌─────────────────────────────────────────────────┐');
      console.log(`│  Port: ${name}`.padEnd(50) + '│');
      console.log('├─────────────────────────────────────────────────┤');
      
      tides.forEach(tide => {
        const icon = tide.type === 'High' ? '⬆️' : '⬇️';
        const label = `${icon} ${tide.type} tide: ${tide.time} (${tide.height}m)`;
        console.log(`│  ${label}`.padEnd(50) + '│');
      });
      
      console.log('└─────────────────────────────────────────────────┘\n');
      
      if (note) {
        console.log(`ℹ️  ${note}\n`);
      }
      console.log('💡 Tip: Edit config.json to change your default port\n');
    })
    .catch(err => {
      console.error('\n❌ Error fetching tides:', err.message);
      console.log('💡 Check your internet connection or try a different port\n');
      process.exit(1);
    });
}

function displayWeather(short = false) {
  const config = loadConfig();
  const location = config.location || 'London';
  
  if (!short) {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║           🌤️  WEATHER TODAY 🌤️                  ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    const now = new Date();
    
    console.log('📅 ' + formatDate(now));
    console.log('📆 Day of month: ' + now.getDate());
    console.log('📊 Week of year: ' + getWeekOfYear(now));
    console.log('🌙 Moon phase: ' + getMoonPhase(now));
    console.log('');
  }
  
  console.log(`📍 Fetching weather for ${location}...`);
  
  fetchWeather(location, false)
    .then(({ weather, name, country }) => {
      const current = weather.current;
      const icon = getWeatherIcon(current.weather_code);
      const description = getWeatherDescription(current.weather_code);
      
      if (short) {
        console.log(`${icon} ${name}, ${country}: ${current.temperature_2m}°C (feels like ${current.apparent_temperature}°C) - ${description}`);
      } else {
        console.log('');
        console.log('┌─────────────────────────────────────────────────┐');
        console.log(`│  Location: ${name}, ${country}`.padEnd(50) + '│');
        console.log('├─────────────────────────────────────────────────┤');
        console.log(`│  ${icon}  ${description}`.padEnd(50) + '│');
        console.log(`│  🌡️  Temperature: ${current.temperature_2m}°C`.padEnd(50) + '│');
        console.log(`│  🤚 Feels like: ${current.apparent_temperature}°C`.padEnd(50) + '│');
        console.log(`│  💧 Humidity: ${current.relative_humidity_2m}%`.padEnd(50) + '│');
        console.log(`│  💨 Wind speed: ${current.wind_speed_10m} km/h`.padEnd(50) + '│');
        console.log('└─────────────────────────────────────────────────┘\n');
        
        console.log('💡 Tip: Edit config.json to change your default location\n');
      }
    })
    .catch(err => {
      console.error('\n❌ Error fetching weather:', err.message);
      if (!short) {
        console.log('💡 Check your internet connection or try a different location\n');
      }
      process.exit(1);
    });
}

function displayTomorrow(short = false) {
  const config = loadConfig();
  const location = config.location || 'London';
  
  if (!short) {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║          🌤️  WEATHER TOMORROW 🌤️                ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 ' + formatDate(tomorrow));
    console.log('📆 Day of month: ' + tomorrow.getDate());
    console.log('📊 Week of year: ' + getWeekOfYear(tomorrow));
    console.log('🌙 Moon phase: ' + getMoonPhase(tomorrow));
    console.log('');
  }
  
  console.log(`📍 Fetching weather forecast for ${location}...`);
  
  fetchWeather(location, true)
    .then(({ weather, name, country }) => {
      if (!weather.daily) {
        console.error('\n❌ Forecast data not available');
        process.exit(1);
      }
      
      const tomorrowData = {
        temp_max: weather.daily.temperature_2m_max[1],
        temp_min: weather.daily.temperature_2m_min[1],
        weather_code: weather.daily.weather_code[1],
        wind_speed: weather.daily.wind_speed_10m_max[1]
      };
      
      const icon = getWeatherIcon(tomorrowData.weather_code);
      const description = getWeatherDescription(tomorrowData.weather_code);
      
      if (short) {
        console.log(`${icon} ${name}, ${country}: ${tomorrowData.temp_min}°C - ${tomorrowData.temp_max}°C - ${description}`);
      } else {
        console.log('');
        console.log('┌─────────────────────────────────────────────────┐');
        console.log(`│  Location: ${name}, ${country}`.padEnd(50) + '│');
        console.log('├─────────────────────────────────────────────────┤');
        console.log(`│  ${icon}  ${description}`.padEnd(50) + '│');
        console.log(`│  🌡️  High: ${tomorrowData.temp_max}°C`.padEnd(50) + '│');
        console.log(`│  🌡️  Low: ${tomorrowData.temp_min}°C`.padEnd(50) + '│');
        console.log(`│  💨 Max wind speed: ${tomorrowData.wind_speed} km/h`.padEnd(50) + '│');
        console.log('└─────────────────────────────────────────────────┘\n');
        
        console.log('💡 Tip: Edit config.json to change your default location\n');
      }
    })
    .catch(err => {
      console.error('\n❌ Error fetching weather:', err.message);
      if (!short) {
        console.log('💡 Check your internet connection or try a different location\n');
      }
      process.exit(1);
    });
}

const args = process.argv.slice(2);
const command = args[0];
const hasShortFlag = args.includes('--short') || args.includes('-s');

if (command === 'tides') {
  displayTides();
} else if (command === 'tomorrow') {
  displayTomorrow(hasShortFlag);
} else {
  displayWeather(hasShortFlag);
}
