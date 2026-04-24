        const emojiMap = {
            0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
            45: '🌫️', 48: '🌫️',
            51: '🌧️', 53: '🌧️', 55: '🌧️',
            61: '🌧️', 63: '🌧️', 65: '🌧️',
            71: '🌨️', 73: '🌨️', 75: '🌨️',
            77: '🌨️', 80: '🌧️', 81: '🌧️', 82: '🌧️',
            85: '🌨️', 86: '🌨️',
            95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        
        function getWeatherIcon(code) {
            return emojiMap[code] || '🌡️';
        }
        
        function getDayName(date) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        }
        
        async function reverseGeocode(lat, lon) {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
                );
                const data = await res.json();
                return data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
            } catch { return 'Unknown'; }
        }
        
        async function getWeather(lat, lon) {
            const url = `/wx?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&hourly=temperature_2m,precipitation_probability,rain`;
            const res = await fetch(url);
            return res.json();
        }
        
        function render(data, location) {
            const current = data.current;
            const daily = data.daily;
            const hourly = data.hourly;
            const today = new Date();
            
            let html = `
                <div class="location">📍 ${location}</div>
                <div class="current">
                    <div class="current-temp">${Math.round(current.temperature_2m)}°C</div>
                    <div class="current-desc">${getWeatherIcon(current.weather_code)} ${current.weather_code}</div>
                    <div class="current-details">
                        <div class="detail">
                            <div class="detail-label">Feels like</div>
                            <div class="detail-value">${Math.round(current.apparent_temperature)}°C</div>
                        </div>
                        <div class="detail">
                            <div class="detail-label">Humidity</div>
                            <div class="detail-value">${current.relative_humidity_2m}%</div>
                        </div>
                        <div class="detail">
                            <div class="detail-label">Wind</div>
                            <div class="detail-value">${Math.round(current.wind_speed_10m)} km/h</div>
                        </div>
                    </div>
                </div>
                
                <div class="hourly-rain">
                    <h3>Rain Next 12 Hours</h3>
                    <div class="hourly-grid" style="grid-template-columns: repeat(6, 1fr); gap: 5px;">
            `;
            
            // Find current hour index
            const nowHour = today.getHours();
            let found = false;
            for(let i = 0; i < 24 && i < hourly.time.length; i++) {
                const t = new Date(hourly.time[i]);
                if (t.getHours() >= nowHour && !found) {
                    found = true;
                    // Show next 12 hours
                    for(let j = i; j < i + 12 && j < hourly.time.length; j++) {
                        const ht = new Date(hourly.time[j]);
                        const hour = ht.getHours();
                        const temp = Math.round(hourly.temperature_2m[j]);
                        const prob = hourly.precipitation_probability[j];
                        const rain = hourly.rain[j];
                        let rainClass = prob < 20 ? 'rain-low' : prob < 50 ? 'rain-med' : 'rain-high';
                        let rainIcon = prob < 10 ? '☀️' : prob < 30 ? '🌦️' : prob < 50 ? '🌧️' : '⛈️';
                        html += `<div class="hourly-item">
                            <div class="hourly-time">${hour}:00</div>
                            <div class="hourly-temp">${temp}°</div>
                            <div class="hourly-rain-icon ${rainClass}">${rainIcon}</div>
                            <div class="hourly-time">${prob}%</div>
                        </div>`;
                    }
                    break;
                }
            }
            
            html += '</div></div>';
            
            html += '<h3 style="margin: 20px 0 10px;">3-Day Forecast</h3><div class="forecast">';
            
            for (let i = 1; i <= 3; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() + i);
                html += `
                    <div class="forecast-day">
                        <div class="forecast-dayname">${getDayName(date)}</div>
                        <div class="forecast-temp">${Math.round(daily.temperature_2m_max[i])}°</div>
                        <div class="forecast-desc">${getWeatherIcon(daily.weather_code[i])}</div>
                        <div class="forecast-desc">${Math.round(daily.temperature_2m_min[i])}° min</div>
                    </div>
                `;
            }
            
            html += '</div>';
            document.getElementById('content').innerHTML = html;
        }
        
        function showError(msg) {
            document.getElementById('content').innerHTML = `
                <div class="error">${msg}</div>
                <p style="text-align:center;margin:20px 0;color:#888;">Or enter a location manually:</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <input type="text" id="manualLocation" placeholder="City name" style="padding:10px;border-radius:8px;border:none;width:200px;">
                    <button onclick="manualSearch()">Go</button>
                </div>
            `;
        }
        
        async function manualSearch() {
            const city = document.getElementById('manualLocation').value;
            if (!city) return;
            
            document.getElementById('content').innerHTML = '<div class="loading">Loading weather...</div>';
            
            try {
                // Geocode city
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
                );
                const geoData = await geoRes.json();
                
                if (!geoData.results || geoData.results.length === 0) {
                    showError('Location not found');
                    return;
                }
                
                const { latitude, longitude, name } = geoData.results[0];
                const weather = await getWeather(latitude, longitude);
                render(weather, name);
            } catch (e) {
                showError('Failed to fetch weather');
            }
        }
        
        async function requestLocation() {
            document.getElementById('content').innerHTML = '<div class="loading">Getting your location...</div>';
            
            if (!navigator.geolocation) {
                // Default to Brisbane
                await loadWeatherForCity('Brisbane');
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    
                    try {
                        const location = await reverseGeocode(lat, lon);
                        const weather = await getWeather(lat, lon);
                        render(weather, location);
                    } catch (e) {
                        await loadWeatherForCity('Brisbane');
                    }
                },
                async (err) => {
                    // Default to Brisbane on denial
                    await loadWeatherForCity('Brisbane');
                }
            );
        }
        
        async function loadWeatherForCity(city) {
            try {
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
                );
                const geoData = await geoRes.json();
                if (!geoData.results) { showError('City not found'); return; }
                const { latitude, longitude, name } = geoData.results[0];
                const weather = await getWeather(latitude, longitude);
                render(weather, name);
            } catch (e) {
                showError('Failed to load weather');
            }
        }
        
        requestLocation();
