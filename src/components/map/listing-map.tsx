'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapListing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean
  location_city: string
  location_state: string
  location_lat: number
  location_lng: number
  category: string
  condition: string
}

interface ListingMapProps {
  listings: MapListing[]
  center?: [number, number]
  zoom?: number
  onListingClick?: (id: string) => void
}

export function ListingMap({
  listings,
  center = [29.7604, -95.3698], // Houston default
  zoom = 9,
  onListingClick,
}: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    // Custom icon
    const icon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: #FF6B2B;
        border: 2px solid #fff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          font-weight: bold;
        ">$</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    })

    // Add markers
    const bounds: L.LatLngExpression[] = []

    listings.forEach((listing) => {
      if (!listing.location_lat || !listing.location_lng) return

      const price = listing.contact_for_price
        ? 'Contact'
        : listing.price_cents
          ? `$${(listing.price_cents / 100).toLocaleString()}`
          : 'Free'

      const marker = L.marker(
        [listing.location_lat, listing.location_lng],
        { icon }
      ).addTo(map)

      marker.bindPopup(
        `<div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <p style="font-weight: 600; font-size: 13px; margin: 0 0 4px 0; color: #e5e5e5;">${listing.title}</p>
          <p style="font-size: 16px; font-weight: 700; color: #FF6B2B; margin: 0 0 4px 0;">${price}</p>
          <p style="font-size: 11px; color: #999; margin: 0;">
            ${listing.category} &middot; ${listing.condition.replace('_', ' ')}
          </p>
          <p style="font-size: 11px; color: #999; margin: 2px 0 0 0;">
            ${listing.location_city}, ${listing.location_state}
          </p>
        </div>`,
        {
          className: 'dark-popup',
        }
      )

      if (onListingClick) {
        marker.on('click', () => {
          onListingClick(listing.id)
        })
      }

      bounds.push([listing.location_lat, listing.location_lng])
    })

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0] as L.LatLngExpression, 12)
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] })
      }
    }

    return () => {
      // Don't destroy map on re-render, just clear markers
    }
  }, [listings, center, zoom, onListingClick])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <>
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1a1a2e;
          color: #e5e5e5;
          border-radius: 8px;
          border: 1px solid #2a2a3e;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .dark-popup .leaflet-popup-tip {
          background: #1a1a2e;
          border: 1px solid #2a2a3e;
        }
        .dark-popup .leaflet-popup-close-button {
          color: #999 !important;
        }
        .custom-map-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <div ref={mapRef} className="h-full w-full rounded-lg" />
    </>
  )
}
