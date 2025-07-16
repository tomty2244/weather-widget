import * as THREE from "https://esm.sh/three";
import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";

// --- UI ELEMENTS ---
const ui = {
    dateTime: document.getElementById('dateTime'),
    mainIcon: document.getElementById('mainWeatherIcon'),
    temperature: document.getElementById('temperature'),
    location: document.getElementById('location'),
    sunrise: document.getElementById('sunriseTime'),
    sunset: document.getElementById('sunsetTime'),
    dayLength: document.getElementById('dayLength'),
    precipIcon: document.getElementById('precipIcon'),
    precipChance: document.getElementById('precipitationChance'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    forecastContainer: document.getElementById('forecast-container'),
    cloudContainer: document.getElementById('cloud-container'),
    cloudTooltip: document.getElementById('cloud-tooltip')
};

// --- 3D CLOUD SETUP ---
let cloud1, cloud2, raindrops1, raindrops2;
const container = ui.cloudContainer;

if (container) {
    const containerRect = container.getBoundingClientRect();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, containerRect.width / containerRect.height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(containerRect.width, containerRect.height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    camera.position.set(0, 0.5, 4.5);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(2, 3, 2);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 1.8;

    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    cloudGroup.position.y = -0.2;

    const cloudMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf0f8ff, transparent: true, opacity: 0.85, roughness: 0.6, metalness: 0.0,
        transmission: 0.1, ior: 1.3, specularIntensity: 0.2,
    });

    function createCloudPart(radius, position) {
        const geometry = new THREE.SphereGeometry(radius, 20, 20);
        const mesh = new THREE.Mesh(geometry, cloudMaterial);
        mesh.position.copy(position);
        return mesh;
    }

    function createDetailedCloud(x, y, z, scale) {
        const singleCloudGroup = new THREE.Group();
        singleCloudGroup.position.set(x, y, z);
        singleCloudGroup.scale.set(scale, scale, scale);
        const parts = [
            { radius: 0.8, position: new THREE.Vector3(0, 0, 0) }, { radius: 0.6, position: new THREE.Vector3(0.7, 0.2, 0.1) },
            { radius: 0.55, position: new THREE.Vector3(-0.6, 0.1, -0.2) }, { radius: 0.7, position: new THREE.Vector3(0.1, 0.4, -0.3) },
        ];
        parts.forEach(part => singleCloudGroup.add(createCloudPart(part.radius, part.position)));
        singleCloudGroup.userData = {
            isRaining: false, originalPosition: singleCloudGroup.position.clone(), bobOffset: Math.random() * Math.PI * 2,
            bobSpeed: 0.0005 + Math.random() * 0.0003, bobAmount: 0.15 + Math.random() * 0.1,
        };
        return singleCloudGroup;
    }
    
    function createRaindropsForCloud(cloud) {
        const rainGroup = new THREE.Group();
        cloud.add(rainGroup);
        cloud.userData.rainGroup = rainGroup;
        const raindropMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEFA, transparent: true, opacity: 0.7 });
        const localRaindrops = [];
        for (let i = 0; i < 50; i++) {
            const raindropGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4);
            const raindrop = new THREE.Mesh(raindropGeom, raindropMaterial);
            raindrop.position.set((Math.random() - 0.5) * 1.5, -0.5 - Math.random() * 2, (Math.random() - 0.5) * 1.5);
            raindrop.userData = { originalY: raindrop.position.y, speed: 0.06 + Math.random() * 0.04 };
            localRaindrops.push(raindrop);
            rainGroup.add(raindrop);
        }
        rainGroup.visible = false;
        return localRaindrops;
    }
    
    cloud1 = createDetailedCloud(-0.7, 0.2, 0, 1.0);
    cloud2 = createDetailedCloud(0.7, -0.1, 0.3, 0.9);
    raindrops1 = createRaindropsForCloud(cloud1);
    raindrops2 = createRaindropsForCloud(cloud2);
    cloudGroup.add(cloud1, cloud2);

    renderer.domElement.addEventListener('click', () => {
        const isCurrentlyRaining = cloud1.userData.isRaining;
        const newRainState = !isCurrentlyRaining;
        
        [cloud1, cloud2].forEach(cloud => {
            cloud.userData.isRaining = newRainState;
            if (cloud.userData.rainGroup) {
                cloud.userData.rainGroup.visible = newRainState;
            }
            // Jiggle animation
            const originalScale = cloud.scale.clone();
            cloud.scale.multiplyScalar(1.1);
            setTimeout(() => cloud.scale.copy(originalScale), 150);
        });
    });

    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now();
        cloudGroup.rotation.y += 0.002;
        [cloud1, cloud2].forEach(cloud => {
            if (cloud) {
                cloud.position.y = cloud.userData.originalPosition.y + Math.sin(time * cloud.userData.bobSpeed + cloud.userData.bobOffset) * cloud.userData.bobAmount;
                if (cloud.userData.isRaining) {
                    const drops = cloud === cloud1 ? raindrops1 : raindrops2;
                    drops.forEach(drop => {
                        drop.position.y -= drop.userData.speed;
                        if (drop.position.y < -4) {
                            drop.position.y = -0.5; // Reset position
                        }
                    });
                }
            }
        });
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // --- RESIZE HANDLER (NEW!) ---
    window.addEventListener('resize', () => {
        const newRect = container.getBoundingClientRect();
        if (newRect.width > 0 && newRect.height > 0) {
            // Update camera aspect ratio
            camera.aspect = newRect.width / newRect.height;
            camera.updateProjectionMatrix();
            // Update renderer size
            renderer.setSize(newRect.width, newRect.height);
        }
    });
    
    setTimeout(() => {
        if (ui.cloudTooltip) ui.cloudTooltip.classList.add('opacity-100');
        setTimeout(() => { if (ui.cloudTooltip) ui.cloudTooltip.classList.remove('opacity-100'); }, 3500);
    }, 1500);

}

// --- WEATHER LOGIC ---
const weatherCodeMap = {
    0: { icon: '☀️', desc: 'ท้องฟ้าแจ่มใส' }, 1: { icon: '🌤️', desc: 'มีเมฆบางส่วน' },
    2: { icon: '⛅', desc: 'มีเมฆเป็นส่วนมาก' }, 3: { icon: '☁️', desc: 'เมฆครึ้ม' },
    45: { icon: '🌫️', desc: 'มีหมอก' }, 48: { icon: '🌫️', desc: 'มีหมอก' },
    51: { icon: '🌦️', desc: 'ฝนตกปรอยๆ' }, 53: { icon: '🌦️', desc: 'ฝนตกปรอยๆ' }, 55: { icon: '🌧️', desc: 'ฝนตกหนัก' },
    61: { icon: '🌧️', desc: 'ฝนตกเล็กน้อย' }, 63: { icon: '🌧️', desc: 'ฝนตก' }, 65: { icon: ' torrential rain' },
    66: { icon: '🌧️', desc: 'ฝนเยือกแข็ง' }, 67: { icon: '🌧️', desc: 'ฝนเยือกแข็ง' },
    71: { icon: '🌨️', desc: 'หิมะตกเล็กน้อย' }, 73: { icon: '🌨️', desc: 'หิมะตก' }, 75: { icon: '❄️', desc: 'หิมะตกหนัก' },
    77: { icon: '❄️', desc: 'เกล็ดหิมะ' }, 80: { icon: '🌧️', desc: 'ฝนโปรย' },
    81: { icon: '🌧️', desc: 'ฝนโปรย' }, 82: { icon: '⛈️', desc: 'พายุฝน' },
    85: { icon: '🌨️', desc: 'หิมะโปรย' }, 86: { icon: '❄️', desc: 'หิมะโปรยหนัก' },
    95: { icon: '⛈️', desc: 'พายุฝนฟ้าคะนอง' }, 96: { icon: '⛈️', desc: 'พายุลูกเห็บ' }, 99: { icon: '⛈️', desc: 'พายุลูกเห็บ' },
};

function updateDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (ui.dateTime) {
        ui.dateTime.textContent = `${now.toLocaleDateString('th-TH', optionsDate)}, ${now.toLocaleTimeString('th-TH', optionsTime)}`;
    }
}

function updateUI(data) {
    const { current, daily } = data;
    
    ui.temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
    const weatherInfo = weatherCodeMap[current.weather_code] || { icon: '❓', desc: 'ไม่ทราบ' };
    ui.mainIcon.textContent = weatherInfo.icon;
    ui.humidity.textContent = `ความชื้น: ${current.relative_humidity_2m}%`;
    ui.windSpeed.textContent = `ความเร็วลม: ${current.wind_speed_10m.toFixed(1)} กม./ชม.`;
    ui.precipChance.textContent = `โอกาสฝนตก: ${daily.precipitation_probability_max[0]}%`;
    ui.precipIcon.textContent = daily.precipitation_probability_max[0] > 10 ? '🌧️' : '💧';

    const sunrise = new Date(daily.sunrise[0]);
    const sunset = new Date(daily.sunset[0]);
    ui.sunrise.textContent = sunrise.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    ui.sunset.textContent = sunset.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dayLengthMs = sunset - sunrise;
    const hours = Math.floor(dayLengthMs / 3600000);
    const minutes = Math.floor((dayLengthMs % 3600000) / 60000);
    ui.dayLength.textContent = `${hours} ชม. ${minutes} น.`;

    ui.forecastContainer.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? 'วันนี้' : date.toLocaleDateString('th-TH', { weekday: 'short' });
        const forecastWeatherInfo = weatherCodeMap[daily.weather_code[i]] || { icon: '❓' };
        
        const forecastEl = document.createElement('div');
        forecastEl.className = `forecast-day rounded-xl p-3 w-20 text-center border border-white/10 shadow-sm cursor-pointer`;
        forecastEl.innerHTML = `
            <div class="day-name text-xs font-medium mb-1 opacity-80">${dayName}</div>
            <div class="forecast-icon text-2xl my-1 drop-shadow-md">${forecastWeatherInfo.icon}</div>
            <div class="high-temp text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">${Math.round(daily.temperature_2m_max[i])}°</div>
            <div class="low-temp text-xs opacity-70">${Math.round(daily.temperature_2m_min[i])}°</div>
        `;
        // Add animation class after a short delay to ensure it runs
        setTimeout(() => forecastEl.classList.add('animate-fadeInUp'), 10 + (i * 100));
        
        ui.forecastContainer.appendChild(forecastEl);
    }
    
    if (cloud1 && cloud2) {
        const isRainingInitially = daily.precipitation_probability_max[0] > 50;
        cloud1.userData.isRaining = isRainingInitially;
        cloud2.userData.isRaining = isRainingInitially;
        if (cloud1.userData.rainGroup) cloud1.userData.rainGroup.visible = isRainingInitially;
        if (cloud2.userData.rainGroup) cloud2.userData.rainGroup.visible = isRainingInitially;
    }
}

async function getWeather(lat, lon) {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Weather data not available.');
        const data = await response.json();
        
        const timezone = data.timezone;
        const city = timezone.split('/')[1].replace(/_/g, ' ');
        const region = timezone.split('/')[0];
        ui.location.textContent = `${city}, ${region}`;
        
        updateUI(data);
    } catch (error) {
        console.error("Weather fetch error:", error);
        ui.location.textContent = 'ไม่สามารถดึงข้อมูลอากาศได้';
    }
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeather(latitude, longitude);
            },
            (error) => {
                let errorMessage = 'An error occurred while retrieving location.';
                let uiMessage = 'ไม่สามารถเข้าถึงตำแหน่งได้';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "User denied the request for Geolocation.";
                        uiMessage = "ปิดการเข้าถึงตำแหน่ง";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage = "An unknown error occurred.";
                        break;
                }
                console.error("Geolocation error:", errorMessage, `(Code: ${error.code})`);
                ui.location.textContent = `${uiMessage} (แสดงผลที่กรุงเทพฯ)`;
                // Fallback to a default location (Bangkok)
                getWeather(13.75, 100.52);
            }
        );
    } else {
        ui.location.textContent = 'ไม่รองรับ Geolocation';
         getWeather(13.75, 100.52);
    }
}

// Initial Load
updateDateTime();
setInterval(updateDateTime, 60000);
getLocation();
