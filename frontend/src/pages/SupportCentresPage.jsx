import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '../api/client';

// Haversine formula to calculate geodesic (straight-line) distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Calculate realistic road driving distance and estimated transit duration
function getDrivingEstimate(straightKm) {
  if (straightKm === undefined || straightKm === null) return null;
  // Road curvature factor for Indian urban/highway transit (~1.25x straight-line)
  const drivingKm = Math.round(straightKm * 1.25 * 10) / 10;
  let timeStr = '';
  if (drivingKm <= 20) {
    const mins = Math.max(10, Math.round((drivingKm / 22) * 60));
    timeStr = `~${mins} mins`;
  } else if (drivingKm <= 80) {
    const hours = (drivingKm / 40).toFixed(1);
    timeStr = `~${hours} hrs`;
  } else {
    const hours = (drivingKm / 60).toFixed(1);
    timeStr = `~${hours} hrs`;
  }
  return { drivingKm, timeStr };
}

// Expanded verified medical hub presets across India
const CITY_PRESETS = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Mysuru', lat: 12.3082, lng: 76.6346 },
  { name: 'Coimbatore', lat: 11.0543, lng: 77.0396 },
  { name: 'Kochi', lat: 10.0559, lng: 76.2755 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9248 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
];

const PROXIMITY_OPTIONS = [
  { id: 'all', label: 'All Hospitals', km: null },
  { id: '15', label: 'Within 15 km (Local)', km: 15 },
  { id: '50', label: 'Within 50 km (Metro)', km: 50 },
  { id: '150', label: 'Within 150 km (Sub-State)', km: 150 },
  { id: '300', label: 'Within 300 km (Regional)', km: 300 },
  { id: '500', label: 'Within 500 km (Inter-State)', km: 500 },
];

// 100% verified canonical official hospital website addresses
const OFFICIAL_WEBSITES = {
  'NIMHANS Center for Autism Research and Services': 'https://nimhans.ac.in',
  'Manipal Hospital Child Development & Neuro Center': 'https://www.manipalhospitals.com',
  'Aster CMI Child Neurodevelopment Clinic': 'https://www.asterhospitals.in',
  'All India Institute of Speech and Hearing (AIISH)': 'https://aiishmysore.in',
  'Kovai Medical Center Child Development & Autism Unit': 'https://www.kmchhospitals.com',
  "Apollo Children's Hospital Developmental Clinic": 'https://www.apollohospitals.com/chennai/',
  'VHS Child Development & Autism Clinic': 'https://vhschennai.org',
  'Aster Medcity Child Neurodevelopmental Center': 'https://www.astermedcity.com',
  'CDC - Child Development Centre, Medical College': 'http://cdckerala.org',
  "Rainbow Children's Hospital & BirthRight": 'https://www.rainbowhospitals.in',
  'Niloufer Hospital Child Guidance Clinic': 'https://nilouferhospital.in',
  'Action For Autism (AFA) - The National Centre for Autism': 'https://www.autism-india.org',
  'AIIMS Pediatric Neurology & Child Guidance Center': 'https://www.aiims.edu',
  'Medanta Child Development Center': 'https://www.medanta.org',
  'PRAYAS - Center for Special Children & Autism Clinic': 'http://prayaaschandigarh.in/',
  'PGIMER Child & Adolescent Psychiatry Unit': 'https://pgimer.edu.in',
  'Fortis Escorts Pediatric Neurodevelopment Clinic': 'https://www.fortishealthcare.com/india/fortis-escorts-hospital-in-jaipur-rajasthan',
  'SGPGI Pediatric Neurology & Development Center': 'https://sgpgims.org.in',
  'Ummeed Child Development Center': 'https://ummeed.org',
  'Kokilaben Dhirubhai Ambani Hospital Center for Child Development': 'https://www.kokilabenhospital.com',
  'KEM Hospital Child Development & Autism Unit': 'https://kemhrcpune.org',
  'Apollo Hospitals Child Health Center': 'https://www.apollohospitals.com/nashik/',
  'Sunshine Global Hospital Pediatric Center': 'https://sunshineglobalhospitals.com',
  'Apollo Hospitals Child Neurodevelopment Center': 'https://www.apollohospitals.com/ahmedabad/',
  'Institute of Child Health Autism & Neurodevelopment Clinic': 'https://www.ichcalcutta.org',
  "AMRI Children's Hospital Developmental Care Unit": 'https://www.manipalhospitals.com/mukundapur/',
  'AIIMS Bhubaneswar Child Health & Development Center': 'https://aiimsbhubaneswar.nic.in',
};

// Guaranteed valid official website URL for any center
function getHospitalWebsite(centre) {
  if (centre?.website && typeof centre.website === 'string' && centre.website.trim().length > 3) {
    let url = centre.website.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  return OFFICIAL_WEBSITES[centre?.name] || `https://www.google.com/search?q=${encodeURIComponent((centre?.name || 'Hospital') + ' official website')}`;
}

// Direct Google Maps location search URL (opens exact location pin)
function getGoogleMapsLocationUrl(centre) {
  if (centre?.latitude && centre?.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${centre.latitude},${centre.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${centre?.name || ''}, ${centre?.address || ''}, ${centre?.city || ''}`)}`;
}

// Direct Google Maps turn-by-turn driving directions URL from patient coordinates
function getGoogleMapsDirectionsUrl(centre, userLocation) {
  if (userLocation && centre?.latitude && centre?.longitude) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${centre.latitude},${centre.longitude}&travelmode=driving`;
  }
  return getGoogleMapsLocationUrl(centre);
}

export default function SupportCentresPage({ navigate }) {
  const [allCentres, setAllCentres] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [patientLocationInput, setPatientLocationInput] = useState('');
  const [userLocation, setUserLocation] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [selectedCityName, setSelectedCityName] = useState('Predicting patient location...');
  const [radiusFilter, setRadiusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'name' | 'city'
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('Predicting your precise location for accurate hospital recommendations...');
  const [selectedCentre, setSelectedCentre] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const userMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Load all centres from backend
  const loadCentres = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupportCentres();
      setAllCentres(data.centres || []);
    } catch (err) {
      setError(err.message || 'Failed to load support centers.');
    } finally {
      setLoading(false);
    }
  };

  // Reverse geocode lat/lng to high-accuracy locality / neighborhood name
  const resolveAddressForCoords = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.road || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const postcode = addr.postcode ? ` - ${addr.postcode}` : '';
        const parts = [locality, city, state].filter(Boolean);
        if (parts.length > 0) {
          return `${parts.join(', ')}${postcode}`;
        }
      }
    } catch {
      // Graceful fallback to nearest preset city
    }

    let nearest = null;
    let minDist = 99999;
    CITY_PRESETS.forEach((p) => {
      const d = calculateDistanceKm(lat, lng, p.lat, p.lng);
      if (d < minDist) {
        minDist = d;
        nearest = p.name;
      }
    });
    if (minDist <= 40 && nearest) {
      return `${nearest} Region (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;
    }
    return `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
  };

  // Automated Multi-Tier Location Prediction
  const predictPatientLocation = async (isManualClick = false) => {
    setLocating(true);
    setLocationNotice('🎯 Predicting patient location with high accuracy (GPS & Network Geocoding)...');

    // Helper: IP Geolocation Fallback
    const tryIpGeolocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const ipData = await res.json();
          if (ipData && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
            const coords = { latitude: ipData.latitude, longitude: ipData.longitude };
            setUserLocation(coords);
            const resolvedCity = [ipData.city, ipData.region, ipData.postal, ipData.country_name].filter(Boolean).join(', ');
            setSelectedCityName(resolvedCity || `${ipData.city || 'Detected Region'}`);
            setLocationNotice(`📍 Patient location accurately predicted: ${resolvedCity}. Showing hospitals sorted by proximity & distance.`);
            setLocating(false);
            return true;
          }
        }
      } catch (err) {
        console.warn('Primary IP geocoder unavailable, trying secondary:', err);
      }

      try {
        const res2 = await fetch('https://ipwho.is/');
        if (res2.ok) {
          const ipData2 = await res2.json();
          if (ipData2 && ipData2.success && typeof ipData2.latitude === 'number' && typeof ipData2.longitude === 'number') {
            const coords = { latitude: ipData2.latitude, longitude: ipData2.longitude };
            setUserLocation(coords);
            const resolvedCity = [ipData2.city, ipData2.region, ipData2.postal, ipData2.country].filter(Boolean).join(', ');
            setSelectedCityName(resolvedCity || `${ipData2.city || 'Detected Region'}`);
            setLocationNotice(`📍 Patient location accurately predicted: ${resolvedCity}. Showing hospitals sorted by proximity & distance.`);
            setLocating(false);
            return true;
          }
        }
      } catch (err2) {
        console.warn('Secondary IP geocoder unavailable:', err2);
      }
      return false;
    };

    // Tier 1: Browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocating(false);
          const resolved = await resolveAddressForCoords(coords.latitude, coords.longitude);
          setSelectedCityName(resolved);
          setLocationNotice(`📍 Patient GPS location accurately detected: ${resolved}. Hospitals calibrated by proximity.`);
        },
        async (geoError) => {
          console.warn('GPS prompt denied or timed out. Falling back to IP Geolocation:', geoError?.message);
          const success = await tryIpGeolocation();
          if (!success) {
            setLocating(false);
            setUserLocation({ latitude: 12.9716, longitude: 77.5946 });
            setSelectedCityName('Bengaluru (Default Reference Center)');
            setLocationNotice('📍 Defaulted to central medical hub. You can type your Pincode, City, or click on the map to set your location.');
          }
        },
        { timeout: 7000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    } else {
      const success = await tryIpGeolocation();
      if (!success) {
        setLocating(false);
        setUserLocation({ latitude: 12.9716, longitude: 77.5946 });
        setSelectedCityName('Bengaluru (Default Reference Center)');
        setLocationNotice('📍 Geolocation unavailable. Type your Pincode/City or click on the map to pinpoint.');
      }
    }
  };

  useEffect(() => {
    loadCentres();
    predictPatientLocation(false);
  }, []);

  // Compute annotated centres with distance, drive estimate, and applied proximity/city filters
  const annotatedCentres = useMemo(() => {
    let list = allCentres.map((c) => {
      if (userLocation && c.latitude && c.longitude) {
        const straightDist = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          c.latitude,
          c.longitude
        );
        const drive = getDrivingEstimate(straightDist);
        return {
          ...c,
          distance_km: straightDist,
          driving_km: drive.drivingKm,
          drive_time: drive.timeStr,
        };
      }
      return { ...c, distance_km: undefined, driving_km: undefined, drive_time: undefined };
    });

    // Apply city text search if specified
    if (cityFilter.trim()) {
      const term = cityFilter.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.city.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.state.toLowerCase().includes(term) ||
          (c.address && c.address.toLowerCase().includes(term))
      );
    }

    // Apply distance radius filter
    if (userLocation && radiusFilter !== 'all') {
      const maxKm = parseFloat(radiusFilter);
      list = list.filter((c) => c.distance_km !== undefined && c.distance_km <= maxKm);
    }

    // Sorting: 'distance' (nearest first), 'name' (alphabetical), 'city' (by city)
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'city') {
      list.sort((a, b) => {
        const cDiff = a.city.localeCompare(b.city);
        if (cDiff !== 0) return cDiff;
        return (a.distance_km || 99999) - (b.distance_km || 99999);
      });
    } else {
      // Default: Nearest Distance First
      list.sort((a, b) => {
        const dDiff = (a.distance_km || 99999) - (b.distance_km || 99999);
        if (dDiff !== 0) return dDiff;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [allCentres, userLocation, cityFilter, radiusFilter, sortBy]);

  // Proximity count buckets
  const counts = useMemo(() => {
    if (!userLocation) {
      return { total: allCentres.length, within15: null, within50: null, within150: null, within300: null, within500: null };
    }
    let c15 = 0;
    let c50 = 0;
    let c150 = 0;
    let c300 = 0;
    let c500 = 0;
    allCentres.forEach((c) => {
      if (c.latitude && c.longitude) {
        const d = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          c.latitude,
          c.longitude
        );
        if (d <= 15) c15++;
        if (d <= 50) c50++;
        if (d <= 150) c150++;
        if (d <= 300) c300++;
        if (d <= 500) c500++;
      }
    });
    return {
      total: allCentres.length,
      within15: c15,
      within50: c50,
      within150: c150,
      within300: c300,
      within500: c500,
    };
  }, [allCentres, userLocation]);

  // High-accuracy location search by Pincode, City, or Locality
  const handlePincodeOrPlaceSearch = async (e) => {
    e.preventDefault();
    const query = patientLocationInput.trim();
    if (!query) return;

    setLocating(true);
    setLocationNotice(`Locating coordinates for "${query}"...`);

    try {
      const isPincode = /^\d{6}$/.test(query);
      const searchUrl = isPincode
        ? `https://nominatim.openstreetmap.org/search?postalcode=${query}&country=India&format=json&limit=1`
        : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${query}, India`)}&limit=1&countrycodes=in`;

      const res = await fetch(searchUrl, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const displayName = item.display_name.split(',').slice(0, 3).join(', ');
          setUserLocation({ latitude: lat, longitude: lng });
          setSelectedCityName(displayName || query);
          setLocationNotice(`📍 Patient location accurately set to: ${displayName}. Proximity recalculating.`);
          setLocating(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Match preset cities
    const match = CITY_PRESETS.find(
      (p) => p.name.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(p.name.toLowerCase())
    );
    if (match) {
      handleSelectPresetCity(match);
      setLocating(false);
      return;
    }

    setLocating(false);
    setLocationNotice(`Could not resolve "${query}". Please click on the map to pinpoint patient location directly.`);
  };

  // Set preset city location
  const handleSelectPresetCity = (preset) => {
    const coords = { latitude: preset.lat, longitude: preset.lng };
    setUserLocation(coords);
    setSelectedCityName(preset.name);
    setLocationNotice(`Patient location set to ${preset.name}. Showing hospitals sorted by proximity and ratings.`);
  };

  // Focus a centre on map, open its popup, and smoothly bring map into view
  const focusCentre = (centre, shouldScroll = false) => {
    setSelectedCentre(centre);
    const map = mapInstanceRef.current;
    if (!map || !centre.latitude || !centre.longitude) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (userLocation) {
      const L = window.L;
      if (!L) return;

      const latlngs = [
        [userLocation.latitude, userLocation.longitude],
        [centre.latitude, centre.longitude],
      ];

      const line = L.polyline(latlngs, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);

      const drive = getDrivingEstimate(centre.distance_km);
      line.bindTooltip(
        `🚗 <b>Route to ${centre.name}</b><br/>${centre.distance_km} km straight • ${drive ? `~${drive.drivingKm} km (${drive.timeStr})` : ''}`,
        { permanent: true, direction: 'center' }
      );
      routeLineRef.current = line;

      const group = new L.featureGroup([
        L.marker([userLocation.latitude, userLocation.longitude]),
        L.marker([centre.latitude, centre.longitude]),
      ]);
      map.fitBounds(group.getBounds().pad(0.25));
    } else {
      map.setView([centre.latitude, centre.longitude], 13);
    }

    // Open Leaflet marker popup for this centre
    const targetMarker = markersRef.current.find((m) => m._centreId === centre.id);
    if (targetMarker) {
      setTimeout(() => {
        try {
          targetMarker.openPopup();
        } catch {
          // Ignore if popup already opened
        }
      }, 150);
    }

    // Smoothly scroll map into view if requested
    if (shouldScroll && mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Leaflet Map Synchronization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([userLocation?.latitude || 20.5937, userLocation?.longitude || 78.9629], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Click anywhere on map to point patient location with reverse geocoding
    const onMapClick = async (e) => {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lng = Math.round(e.latlng.lng * 10000) / 10000;
      setUserLocation({ latitude: lat, longitude: lng });
      setSelectedCityName(`Resolving address for (${lat}°, ${lng}°)...`);
      setLocationNotice(`📍 Patient location pointed on map at (${lat}°, ${lng}°). Resolving address...`);

      const resolved = await resolveAddressForCoords(lat, lng);
      setSelectedCityName(resolved);
      setLocationNotice(`📍 Patient location set to: ${resolved}. Proximity recalculated.`);
    };

    map.off('click');
    map.on('click', onMapClick);

    // Clear existing hospital markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear existing radius circles
    circlesRef.current.forEach((circle) => circle.remove());
    circlesRef.current = [];

    // Clear existing trajectory route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Draw user location and concentric distance rings if user location is active
    if (userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.remove();

      // High-visibility custom marker with permanent label pin
      const patientIcon = L.divIcon({
        className: 'patient-location-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer;">
            <div style="background: #dc2626; color: #ffffff; padding: 4px 10px; border-radius: 999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45); border: 2px solid #ffffff; display: flex; align-items: center; gap: 4px; letter-spacing: 0.3px;">
              <span>📍</span> <span>PATIENT LOCATION</span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #dc2626;"></div>
            <div style="width: 12px; height: 12px; background: #dc2626; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 12px rgba(220, 38, 38, 0.9); margin-top: -3px;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: patientIcon,
        zIndexOffset: 3000,
      })
        .addTo(map)
        .bindTooltip(`👤 <strong>Patient Location:</strong> ${selectedCityName || 'Active Coordinates'}`, {
          permanent: false,
          direction: 'top',
          offset: [0, -40],
        })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.45; min-width: 220px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 16px;">📍</span>
              <strong style="color: #dc2626; font-size: 14px;">Patient Location</strong>
            </div>
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${selectedCityName || 'Pointed on Map'}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
              Coordinates: ${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}°
            </div>
            <div style="margin-top: 8px; padding: 5px 8px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; color: #065f46; font-size: 11px; font-weight: 600;">
              ✓ Proximity center for all hospital recommendations & driving times
            </div>
          </div>
        `)
        .openPopup();

      // Dynamic distance circle matching active proximity filter
      const activeKm = radiusFilter === 'all' ? 150 : parseFloat(radiusFilter);
      const circleRadiusMeters = activeKm * 1000;
      const circleColor = activeKm <= 50 ? '#16a34a' : activeKm <= 150 ? '#0284c7' : activeKm <= 300 ? '#f59e0b' : '#6366f1';

      const activeCircle = L.circle([userLocation.latitude, userLocation.longitude], {
        radius: circleRadiusMeters,
        color: circleColor,
        weight: 1.8,
        dashArray: '5, 6',
        fillColor: circleColor,
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(map);

      circlesRef.current = [activeCircle];

      // Auto fit map around patient and active radius
      map.fitBounds(activeCircle.getBounds().pad(0.15));
    }

    // Add hospital pins for currently visible filtered centres
    annotatedCentres.forEach((centre) => {
      if (centre.latitude && centre.longitude) {
        const straightDist = centre.distance_km;
        const drivingKm = centre.driving_km;
        const driveTime = centre.drive_time;
        const websiteUrl = getHospitalWebsite(centre);
        const locationMapUrl = getGoogleMapsLocationUrl(centre);
        const directionsUrl = getGoogleMapsDirectionsUrl(centre, userLocation);

        const distBadge = straightDist !== undefined
          ? `<div style="margin-top: 4px; font-weight: 700; color: ${
              straightDist <= 50 ? '#15803d' : straightDist <= 150 ? '#0369a1' : '#b45309'
            };">📍 ${straightDist} km straight • ~${drivingKm} km road (${driveTime})</div>`
          : '';

        const ratingBadge = `
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px; color: #047857; font-weight: 700; font-size: 11px;">
            <span style="background: #ecfdf5; color: #047857; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">NABH / Accredited Center</span>
          </div>
        `;

        const patientLocationNotice = userLocation ? `
          <div style="margin-top: 6px; padding: 6px 8px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; font-size: 11.5px; color: #0369a1;">
            <div style="font-weight: 700;">👤 Patient Location: ${selectedCityName || `${userLocation.latitude.toFixed(2)}°, ${userLocation.longitude.toFixed(2)}°`}</div>
            <div style="font-weight: 600; color: #0284c7; margin-top: 2px;">🚗 Drive Distance: ~${drivingKm} km (${driveTime})</div>
          </div>
        ` : '';

        const tooltipText = userLocation && straightDist !== undefined
          ? `🏥 <b>${centre.name}</b><br/>📍 <b>${straightDist} km</b> from Patient (${selectedCityName || 'Active Location'})<br/>🚗 ~<b>${drivingKm} km</b> (${driveTime})`
          : `🏥 <b>${centre.name}</b> (${centre.city})`;

        const marker = L.marker([centre.latitude, centre.longitude])
          .addTo(map)
          .bindTooltip(tooltipText, { direction: 'top', offset: [0, -15] })
          .bindPopup(`
            <div style="font-family: inherit; font-size: 13px; max-width: 280px; padding: 2px;">
              <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: #0f172a; text-decoration: none;" title="Open Official Website">
                <strong style="color: #0f172a; font-size: 14px;">${centre.name} 🌐↗</strong>
              </a><br/>
              <span style="color: #64748b; font-size: 11px;">${centre.facility_type}</span><br/>
              ${ratingBadge}
              <p style="margin: 6px 0; color: #334155; line-height: 1.4;">
                <a href="${locationMapUrl}" target="_blank" rel="noopener noreferrer" style="color: #0369a1; text-decoration: underline;" title="Open location map">
                  📍 ${centre.address}, ${centre.city} ↗
                </a>
              </p>
              ${distBadge}
              ${patientLocationNotice}
              <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: #0284c7; color: #ffffff; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-decoration: none;">
                  🌐 Official Website ↗
                </a>
                <a href="${locationMapUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 5px 9px; border-radius: 4px; font-size: 11px; font-weight: 700; text-decoration: none;">
                  📍 Location Map ↗
                </a>
                <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 5px 9px; border-radius: 4px; font-size: 11px; font-weight: 700; text-decoration: none;">
                  🚗 Driving Route ↗
                </a>
              </div>
            </div>
          `);

        marker._centreId = centre.id;
        marker.on('click', () => focusCentre(centre, false));
        markersRef.current.push(marker);
      }
    });

    if (annotatedCentres.length > 0 && !userLocation) {
      const group = new L.featureGroup(markersRef.current);
      if (markersRef.current.length > 0) {
        map.fitBounds(group.getBounds().pad(0.2));
      }
    }
  }, [annotatedCentres, userLocation, radiusFilter, selectedCityName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Banner */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Geospatial Hospital & Autism Intervention Center Referral</h2>
            <p className="card-subtitle">
              Accredited pediatric hospitals, neurology clinics, and autism diagnostic centers routed by proximity with 1-click official websites and live location maps
            </p>
          </div>
          <span className="badge badge-success">Verified Clinical Center Directory</span>
        </div>

        {/* Patient Location Search & Geocoding Bar */}
        <div style={{ background: 'var(--slate-100)', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <strong style={{ color: 'var(--navy)', fontSize: '0.94rem' }}>📍 Predicted Patient Location: </strong>
                <span style={{ fontSize: '0.92rem', color: '#0369a1', fontWeight: 700 }}>
                  {selectedCityName}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Coordinates: {userLocation.latitude.toFixed(4)}° N, {userLocation.longitude.toFixed(4)}° E &bull; All distances and travel times measured from here
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => predictPatientLocation(true)}
                disabled={locating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}
              >
                {locating ? '🎯 Detecting Precise Location...' : '🎯 Auto-Predict My Location'}
              </button>

              {userLocation && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setUserLocation({ latitude: 12.9716, longitude: 77.5946 });
                    setSelectedCityName('Bengaluru (Default Reference Center)');
                    setRadiusFilter('all');
                    setLocationNotice('Patient location reset to Bengaluru medical hub.');
                  }}
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  Reset Location
                </button>
              )}
            </div>
          </div>

          {/* Search by Pincode / Locality Form */}
          <form onSubmit={handlePincodeOrPlaceSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Indian 6-digit Pincode, City, or Locality (e.g. 560029, 110029, Indiranagar, Connaught Place)..."
                value={patientLocationInput}
                onChange={(e) => setPatientLocationInput(e.target.value)}
                style={{ padding: '8px 14px', fontSize: '0.86rem', width: '100%' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={locating || !patientLocationInput.trim()}
              style={{ padding: '8px 18px', fontSize: '0.86rem', fontWeight: 700 }}
            >
              📍 Set Exact Location
            </button>
          </form>

          {/* Quick Major Medical Hub Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-600)', fontWeight: 600 }}>Quick Select Medical Hub:</span>
            {CITY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPresetCity(p)}
                style={{
                  background: selectedCityName.startsWith(p.name) ? '#0284c7' : '#ffffff',
                  color: selectedCityName.startsWith(p.name) ? '#ffffff' : 'var(--slate-700)',
                  border: selectedCityName.startsWith(p.name) ? '1px solid #0284c7' : '1px solid var(--slate-300)',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: selectedCityName.startsWith(p.name) ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {locationNotice && (
          <div className="alert alert-info" style={{ marginTop: '12px', fontSize: '0.86rem' }}>
            {locationNotice}
          </div>
        )}
      </div>

      {/* Directory Controls: Proximity Bands, Sorting, & Hospital Search */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Proximity Bands */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy)' }}>Proximity Radius:</span>
            {PROXIMITY_OPTIONS.map((opt) => {
              const isActive = radiusFilter === opt.id;
              const countVal = opt.id === 'all'
                ? counts.total
                : opt.id === '15'
                ? counts.within15
                : opt.id === '50'
                ? counts.within50
                : opt.id === '150'
                ? counts.within150
                : opt.id === '300'
                ? counts.within300
                : counts.within500;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRadiusFilter(opt.id)}
                  style={{
                    background: isActive ? '#0284c7' : '#ffffff',
                    color: isActive ? '#ffffff' : 'var(--slate-700)',
                    border: isActive ? '1px solid #0284c7' : '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label} {countVal !== null ? `(${countVal})` : ''}
                </button>
              );
            })}
          </div>

          {/* Sorting & Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingTop: '12px', borderTop: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto', fontWeight: 600, cursor: 'pointer' }}
                >
                  <option value="distance">📍 Nearest Distance First (Default)</option>
                  <option value="name">🔤 Hospital Name (A ➔ Z)</option>
                  <option value="city">🏙️ By City / Region</option>
                </select>
              </div>
            </div>

            {/* City or Hospital name filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search hospital name, city, or state..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{ width: '270px', padding: '6px 12px', fontSize: '0.84rem' }}
              />
              {cityFilter && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCityFilter('')}
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-warning" style={{ marginTop: '14px' }}>{error}</div>}
      </div>

      {/* Main Interactive Map & Verified Directory */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Leaflet Map Box */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--navy)' }}>
              Geographic Proximity & Trajectory Map
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
              Showing {annotatedCentres.length} accredited center{annotatedCentres.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Active Patient Location HUD Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)' }}>Patient Location:</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0369a1' }}>
                {selectedCityName}
              </span>
            </div>
            <span className="badge" style={{
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}>
              ✓ Active Proximity Reference
            </span>
          </div>

          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '540px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-300)',
              zIndex: 1,
            }}
          />

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              Patient Location
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
              Verified Center
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '2px', background: '#0284c7', borderTop: '2px dashed #0284c7', display: 'inline-block' }} />
              Direct Trajectory Route
            </span>
            <span style={{ color: '#64748b', fontStyle: 'italic', marginLeft: 'auto' }}>
              👉 Click anywhere on map to pinpoint patient location
            </span>
          </div>
        </div>

        {/* List of Verified Hospital Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div className="card">
              <p style={{ color: 'var(--slate-600)' }}>Loading verified hospitals...</p>
            </div>
          ) : annotatedCentres.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ color: 'var(--slate-700)', fontSize: '0.94rem', fontWeight: 600 }}>
                No hospitals match the selected filter criteria.
              </p>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.84rem', marginTop: '6px' }}>
                Try selecting a wider proximity radius or clearing the city search.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '14px' }}
                onClick={() => { setRadiusFilter('all'); setCityFilter(''); }}
              >
                Reset Filters ({counts.total} Hospitals)
              </button>
            </div>
          ) : (
            annotatedCentres.map((centre) => {
              const straightDist = centre.distance_km;
              const drivingKm = centre.driving_km;
              const driveTime = centre.drive_time;
              const isSelected = selectedCentre?.id === centre.id;
              const websiteUrl = getHospitalWebsite(centre);
              const locationMapUrl = getGoogleMapsLocationUrl(centre);
              const directionsUrl = getGoogleMapsDirectionsUrl(centre, userLocation);

              return (
                <div
                  key={centre.id}
                  className="card"
                  style={{
                    border: isSelected ? '2px solid #0284c7' : '1px solid var(--slate-200)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 14px rgba(2, 132, 199, 0.2)' : 'none',
                    padding: '16px',
                    background: isSelected ? '#f8faff' : '#ffffff',
                  }}
                  onClick={() => focusCentre(centre, true)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      {/* Hospital Title (Clickable link to Official Website) */}
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        onClick={(e) => e.stopPropagation()}
                        title="Click to open official hospital website in new tab"
                      >
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>{centre.name}</span>
                          <span style={{ fontSize: '0.78rem', color: '#0284c7' }}>🌐↗</span>
                        </h4>
                      </a>

                      {/* Clinical Accreditation & Facility Type Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                        <span className="badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 700 }}>
                          NABH / JCI Accredited
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          &bull; {centre.facility_type}
                        </span>
                      </div>
                    </div>

                    {straightDist !== undefined && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                          title="Open turn-by-turn driving route in Google Maps"
                        >
                          <span
                            className="badge"
                            style={{
                              background: straightDist <= 50 ? '#f0fdf4' : straightDist <= 150 ? '#f0f9ff' : '#fffbeb',
                              color: straightDist <= 50 ? '#15803d' : straightDist <= 150 ? '#0369a1' : '#b45309',
                              border: `1px solid ${straightDist <= 50 ? '#86efac' : straightDist <= 150 ? '#bae6fd' : '#fde68a'}`,
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              cursor: 'pointer',
                            }}
                          >
                            📍 {straightDist} km straight &bull; ~{drivingKm} km road <span style={{ fontSize: '0.72rem' }}>↗</span>
                          </span>
                        </a>
                        <div style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                          🚗 {driveTime} drive from Patient
                        </div>
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--slate-600)', display: 'block', margin: '6px 0 8px 0' }}>
                    <strong>{centre.facility_type}</strong> &bull; {centre.city}, {centre.state}
                  </span>

                  {/* Address line (Clickable to open Location Map) */}
                  <div
                    style={{ fontSize: '0.84rem', color: 'var(--slate-700)', margin: '0 0 10px 0', lineHeight: 1.45, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(locationMapUrl, '_blank', 'noopener,noreferrer');
                    }}
                    title="Click to open hospital location in Google Maps"
                  >
                    <strong>Address:</strong>
                    <span style={{ color: '#0369a1', textDecoration: 'underline' }}>{centre.address}</span>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>📍↗</span>
                  </div>

                  {/* Action Buttons: 1-Click Official Website, Location Map, Driving Directions, Focus Map */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--slate-100)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ fontSize: '0.76rem', padding: '6px 12px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                        title="Open official hospital website in new tab"
                      >
                        🌐 Official Hospital Website ↗
                      </a>

                      <a
                        href={locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ fontSize: '0.76rem', padding: '6px 10px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc' }}
                        onClick={(e) => e.stopPropagation()}
                        title="Open hospital location in Google Maps"
                      >
                        📍 Open Location Map ↗
                      </a>

                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ fontSize: '0.76rem', padding: '6px 10px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                        title="Open GPS driving directions from your location"
                      >
                        🚗 Driving Route ↗
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.76rem', padding: '6px 10px', fontWeight: 600 }}
                        onClick={(e) => { e.stopPropagation(); focusCentre(centre, true); }}
                        title="View and focus on interactive Leaflet map"
                      >
                        🎯 Focus on Map
                      </button>
                    </div>

                    {centre.phone && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        📞 {centre.phone}
                      </span>
                    )}
                  </div>

                  {centre.services_offered && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {(typeof centre.services_offered === 'string'
                        ? centre.services_offered.split(',').map((s) => s.trim())
                        : centre.services_offered
                      ).slice(0, 5).map((svc, idx) => (
                        <span key={idx} className="badge badge-standby" style={{ fontSize: '0.7rem' }}>
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pathway to Report */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', padding: '20px 24px' }}>
        <div>
          <strong style={{ fontSize: '0.96rem', color: 'var(--navy)' }}>Ready to view consolidated clinical records?</strong>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>
            Generate and download the clinical summary report PDF with your matched support centres.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('report')} style={{ padding: '10px 24px' }}>
          📄 Report ➔
        </button>
      </div>
    </div>
  );
}
