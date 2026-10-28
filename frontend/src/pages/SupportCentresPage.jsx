import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '../api/client';

// Haversine formula to calculate geodesic distance in km between two lat/lng points
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

const CITY_PRESETS = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

export default function SupportCentresPage({ navigate }) {
  const [allCentres, setAllCentres] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [radiusFilter, setRadiusFilter] = useState('all'); // 'all', '200', '300', '500'
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationNotice, setLocationNotice] = useState('');
  const [selectedCentre, setSelectedCentre] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const userMarkerRef = useRef(null);

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

  useEffect(() => {
    loadCentres();
  }, []);

  // Compute annotated centres with distance and applied filters
  const annotatedCentres = useMemo(() => {
    let list = allCentres.map((c) => {
      if (userLocation && c.latitude && c.longitude) {
        const dist = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          c.latitude,
          c.longitude
        );
        return { ...c, distance_km: dist };
      }
      return { ...c, distance_km: undefined };
    });

    // If user location is known, sort nearest first
    if (userLocation) {
      list.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999));
    }

    // Apply city text search if specified
    if (cityFilter.trim()) {
      const term = cityFilter.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.city.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.state.toLowerCase().includes(term)
      );
    }

    // Apply distance radius filter
    if (userLocation && radiusFilter !== 'all') {
      const maxKm = parseFloat(radiusFilter);
      list = list.filter((c) => c.distance_km !== undefined && c.distance_km <= maxKm);
    }

    return list;
  }, [allCentres, userLocation, cityFilter, radiusFilter]);

  // Proximity count buckets
  const counts = useMemo(() => {
    if (!userLocation) {
      return { total: allCentres.length, within200: null, within300: null, within500: null };
    }
    let c200 = 0;
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
        if (d <= 200) c200++;
        if (d <= 300) c300++;
        if (d <= 500) c500++;
      }
    });
    return {
      total: allCentres.length,
      within200: c200,
      within300: c300,
      within500: c500,
    };
  }, [allCentres, userLocation]);

  // Handle GPS detection
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your browser. Please select a city below.');
      return;
    }

    setLocating(true);
    setLocationNotice('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setSelectedCityName('Your GPS Location');
        setLocating(false);
        setLocationNotice(`Location set to Latitude ${coords.latitude.toFixed(2)}°, Longitude ${coords.longitude.toFixed(2)}°. Hospitals sorted by proximity.`);
      },
      (geoError) => {
        setLocating(false);
        let msg = 'Could not access GPS location. Please select your nearest city below to see proximity.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please select your nearest city below to view hospitals near 200 km, 300 km, and 500 km.';
        }
        setLocationNotice(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Set preset city location
  const handleSelectPresetCity = (preset) => {
    const coords = { latitude: preset.lat, longitude: preset.lng };
    setUserLocation(coords);
    setSelectedCityName(preset.name);
    setLocationNotice(`Patient location set to ${preset.name}. Showing hospitals sorted by distance.`);
  };

  // Leaflet Map Synchronization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing hospital markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear existing radius circles
    circlesRef.current.forEach((circle) => circle.remove());
    circlesRef.current = [];

    // Draw user location and concentric distance rings if user location is active
    if (userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      userMarkerRef.current = L.circleMarker([userLocation.latitude, userLocation.longitude], {
        radius: 9,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95,
      })
        .addTo(map)
        .bindPopup(`<strong>📍 Patient Location</strong><br/>${selectedCityName || 'Active Coordinates'}`);

      // 200 km circle (green)
      const circle200 = L.circle([userLocation.latitude, userLocation.longitude], {
        radius: 200000,
        color: '#16a34a',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#16a34a',
        fillOpacity: 0.05,
      }).addTo(map).bindTooltip('200 km radius', { permanent: false });

      // 300 km circle (amber)
      const circle300 = L.circle([userLocation.latitude, userLocation.longitude], {
        radius: 300000,
        color: '#f59e0b',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#f59e0b',
        fillOpacity: 0.03,
      }).addTo(map).bindTooltip('300 km radius', { permanent: false });

      // 500 km circle (blue)
      const circle500 = L.circle([userLocation.latitude, userLocation.longitude], {
        radius: 500000,
        color: '#0284c7',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#0284c7',
        fillOpacity: 0.02,
      }).addTo(map).bindTooltip('500 km radius', { permanent: false });

      circlesRef.current = [circle200, circle300, circle500];

      // Auto center around user and active radius
      if (radiusFilter === '200') {
        map.fitBounds(circle200.getBounds());
      } else if (radiusFilter === '300') {
        map.fitBounds(circle300.getBounds());
      } else if (radiusFilter === '500') {
        map.fitBounds(circle500.getBounds());
      } else {
        map.setView([userLocation.latitude, userLocation.longitude], 7);
      }
    }

    // Add hospital pins for currently visible filtered centres
    annotatedCentres.forEach((centre) => {
      if (centre.latitude && centre.longitude) {
        const distBadge = centre.distance_km !== undefined
          ? `<div style="margin-top: 4px; font-weight: 700; color: ${
              centre.distance_km <= 200 ? '#15803d' : centre.distance_km <= 300 ? '#b45309' : '#0369a1'
            };">📍 ${centre.distance_km} km away</div>`
          : '';

        const marker = L.marker([centre.latitude, centre.longitude])
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 13px; max-width: 240px;">
              <strong style="color: #0f172a; font-size: 14px;">${centre.name}</strong><br/>
              <span style="color: #64748b; font-size: 11px;">${centre.facility_type}</span><br/>
              <p style="margin: 6px 0; color: #334155;">${centre.address}, ${centre.city}</p>
              ${distBadge}
              ${centre.phone ? `<div style="margin-top: 4px;"><strong>Phone:</strong> ${centre.phone}</div>` : ''}
              ${centre.website ? `<div style="margin-top: 4px;"><a href="${centre.website}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 600;">Visit Website ↗</a></div>` : ''}
            </div>
          `);

        marker.on('click', () => setSelectedCentre(centre));
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

  const focusCentre = (centre) => {
    setSelectedCentre(centre);
    if (mapInstanceRef.current && centre.latitude && centre.longitude) {
      mapInstanceRef.current.setView([centre.latitude, centre.longitude], 12);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Location Based Personalized Support</h2>
            <p className="card-subtitle">
              Accredited pediatric hospitals and multidisciplinary autism diagnostic centers within 200 km, 300 km, and 500 km
            </p>
          </div>
          <span className="badge badge-success">Verified Directory</span>
        </div>

        {/* Patient Location Selection Section */}
        <div style={{ background: 'var(--slate-100)', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div>
              <strong style={{ color: 'var(--navy)', fontSize: '0.94rem' }}>Patient Location: </strong>
              <span style={{ fontSize: '0.92rem', color: selectedCityName ? '#0369a1' : 'var(--slate-600)', fontWeight: selectedCityName ? 700 : 400 }}>
                {selectedCityName ? `📍 ${selectedCityName}` : 'No location specified (select below or detect GPS)'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGetCurrentLocation}
                disabled={locating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                {locating ? 'Detecting Location...' : '📍 Detect My Location'}
              </button>

              {userLocation && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setUserLocation(null);
                    setSelectedCityName('');
                    setRadiusFilter('all');
                    setLocationNotice('Location cleared. Showing all verified centers.');
                  }}
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  Clear Location
                </button>
              )}
            </div>
          </div>

          {/* Quick City Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-600)', fontWeight: 600 }}>Quick Select City:</span>
            {CITY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPresetCity(p)}
                style={{
                  background: selectedCityName === p.name ? '#0284c7' : '#ffffff',
                  color: selectedCityName === p.name ? '#ffffff' : 'var(--slate-700)',
                  border: selectedCityName === p.name ? '1px solid #0284c7' : '1px solid var(--slate-300)',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  fontWeight: selectedCityName === p.name ? 700 : 500,
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

        {/* Distance Range Filter Selector */}
        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy)' }}>Proximity Filter:</span>

              <button
                type="button"
                onClick={() => setRadiusFilter('all')}
                style={{
                  background: radiusFilter === 'all' ? 'var(--navy)' : '#ffffff',
                  color: radiusFilter === 'all' ? '#ffffff' : 'var(--slate-700)',
                  border: radiusFilter === 'all' ? '1px solid var(--navy)' : '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All Hospitals ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!userLocation) {
                    handleSelectPresetCity(CITY_PRESETS[0]);
                  }
                  setRadiusFilter('200');
                }}
                style={{
                  background: radiusFilter === '200' ? '#16a34a' : '#ffffff',
                  color: radiusFilter === '200' ? '#ffffff' : '#15803d',
                  border: radiusFilter === '200' ? '1px solid #16a34a' : '1px solid #86efac',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Within 200 km {counts.within200 !== null ? `(${counts.within200})` : ''}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!userLocation) {
                    handleSelectPresetCity(CITY_PRESETS[0]);
                  }
                  setRadiusFilter('300');
                }}
                style={{
                  background: radiusFilter === '300' ? '#f59e0b' : '#ffffff',
                  color: radiusFilter === '300' ? '#ffffff' : '#b45309',
                  border: radiusFilter === '300' ? '1px solid #f59e0b' : '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Within 300 km {counts.within300 !== null ? `(${counts.within300})` : ''}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!userLocation) {
                    handleSelectPresetCity(CITY_PRESETS[0]);
                  }
                  setRadiusFilter('500');
                }}
                style={{
                  background: radiusFilter === '500' ? '#0284c7' : '#ffffff',
                  color: radiusFilter === '500' ? '#ffffff' : '#0369a1',
                  border: radiusFilter === '500' ? '1px solid #0284c7' : '1px solid #bae6fd',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Within 500 km {counts.within500 !== null ? `(${counts.within500})` : ''}
              </button>
            </div>

            {/* City search box */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search hospital or city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{ width: '220px', padding: '6px 12px', fontSize: '0.84rem' }}
              />
              {cityFilter && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCityFilter('')}
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-warning" style={{ marginTop: '14px' }}>{error}</div>}
      </div>

      {/* Main Map & Directory Grid */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Leaflet Map Box */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Geographic Proximity Map</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
              Showing {annotatedCentres.length} hospital{annotatedCentres.length === 1 ? '' : 's'}
            </span>
          </div>

          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '520px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-300)',
              zIndex: 1,
            }}
          />

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
              Patient Location
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '2px', background: '#16a34a', display: 'inline-block' }} />
              Within 200 km
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '2px', background: '#f59e0b', display: 'inline-block' }} />
              Within 300 km
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '2px', background: '#0284c7', display: 'inline-block' }} />
              Within 500 km
            </span>
          </div>
        </div>

        {/* List of Filtered Hospitals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div className="card">
              <p style={{ color: 'var(--slate-600)' }}>Loading verified hospitals...</p>
            </div>
          ) : annotatedCentres.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ color: 'var(--slate-700)', fontSize: '0.94rem', fontWeight: 600 }}>
                No hospitals found within {radiusFilter !== 'all' ? `${radiusFilter} km` : 'this search'}.
              </p>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.84rem', marginTop: '6px' }}>
                Try selecting a wider radius band (Within 300 km or Within 500 km) or view all hospitals.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '14px' }}
                onClick={() => { setRadiusFilter('all'); setCityFilter(''); }}
              >
                Show All Hospitals ({counts.total})
              </button>
            </div>
          ) : (
            annotatedCentres.map((centre) => {
              const dist = centre.distance_km;
              const isSelected = selectedCentre?.id === centre.id;

              return (
                <div
                  key={centre.id}
                  className="card"
                  style={{
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                    padding: '16px',
                  }}
                  onClick={() => focusCentre(centre)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                      {centre.name}
                    </h4>

                    {dist !== undefined && (
                      <span
                        className="badge"
                        style={{
                          background: dist <= 200 ? '#f0fdf4' : dist <= 300 ? '#fffbeb' : '#f0f9ff',
                          color: dist <= 200 ? '#15803d' : dist <= 300 ? '#b45309' : '#0369a1',
                          border: `1px solid ${dist <= 200 ? '#86efac' : dist <= 300 ? '#fde68a' : '#bae6fd'}`,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📍 {dist} km {dist <= 200 ? '• Within 200 km' : dist <= 300 ? '• Within 300 km' : dist <= 500 ? '• Within 500 km' : ''}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--slate-600)', display: 'block', marginBottom: '8px' }}>
                    {centre.facility_type} &bull; {centre.city}, {centre.state}
                  </span>

                  <p style={{ fontSize: '0.84rem', color: 'var(--slate-700)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
                    <strong>Address:</strong> {centre.address}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {centre.phone && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--slate-700)' }}>
                        <strong>Phone:</strong> {centre.phone}
                      </span>
                    )}

                    {centre.website && (
                      <a
                        href={centre.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit Website ↗
                      </a>
                    )}
                  </div>

                  {centre.services_offered && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {(typeof centre.services_offered === 'string'
                        ? centre.services_offered.split(',').map((s) => s.trim())
                        : centre.services_offered
                      ).slice(0, 4).map((svc, idx) => (
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
            Generate and download the clinical summary report PDF.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('report')} style={{ padding: '10px 24px' }}>
          📄 Report ➔
        </button>
      </div>
    </div>
  );
}
