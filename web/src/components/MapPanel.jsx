import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { coordinatesOf, googleMapsUrl } from '../utils.js';

function loadGoogleMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__nwsdbGooglePromise) return window.__nwsdbGooglePromise;
  window.__nwsdbGooglePromise = new Promise((resolve, reject) => {
    const callback = `nwsdbMapsReady${Date.now()}`;
    window[callback] = () => { resolve(window.google.maps); delete window[callback]; };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return window.__nwsdbGooglePromise;
}

export default function MapPanel({ complaints }) {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const plotted = complaints.filter((item) => coordinatesOf(item));

  useEffect(() => {
    if (!key || !mapRef.current || !plotted.length) return undefined;
    let cancelled = false;
    loadGoogleMaps(key).then((maps) => {
      if (cancelled) return;
      const bounds = new maps.LatLngBounds();
      const map = new maps.Map(mapRef.current, { center: { lat: 7.8731, lng: 80.7718 }, zoom: 7, mapTypeControl: false, streetViewControl: false });
      plotted.forEach((complaint) => {
        const point = coordinatesOf(complaint);
        const position = { lat: point.latitude, lng: point.longitude };
        const marker = new maps.Marker({ position, map, title: `${complaint.publicId}: ${complaint.status}` });
        const info = new maps.InfoWindow({ content: `<strong>${complaint.publicId}</strong><br>${complaint.area}<br>${complaint.status.replace('_', ' ')}` });
        marker.addListener('click', () => info.open({ anchor: marker, map }));
        bounds.extend(position);
      });
      map.fitBounds(bounds, 40);
    }).catch((error) => setMapError(error.message));
    return () => { cancelled = true; };
  }, [key, complaints]);

  if (key && !mapError) return <div ref={mapRef} className="map-canvas" aria-label="Complaint locations map" />;
  return (
    <div className="map-fallback">
      <div className="map-fallback-head"><MapPin size={19} /><b>{plotted.length} plotted locations</b><span>{key ? mapError : 'Add a Google Maps key for the interactive map'}</span></div>
      <div className="map-location-list">
        {plotted.slice(0, 8).map((complaint) => (
          <a key={complaint._id} href={googleMapsUrl(complaint)} target="_blank" rel="noreferrer">
            <span><b>{complaint.publicId}</b><small>{complaint.area} · {complaint.status.replace('_', ' ')}</small></span><ExternalLink size={16} />
          </a>
        ))}
        {!plotted.length && <p>No coordinate data matches the current filters.</p>}
      </div>
    </div>
  );
}

