'use client';

import { useEffect, useRef } from 'react';

interface MapProps {
  address: string;
  lat: number;
  lng: number;
}

export default function Map({ address, lat, lng }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Create the iframe URL with your location
    const encodedAddress = encodeURIComponent(address);
    const iframeSrc = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodedAddress}&center=${lat},${lng}&zoom=15`;
    
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  }, [address, lat, lng]);

  return (
    <section id="location" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Our Location</h2>
          <p className="mt-4 text-lg text-gray-600">{address}</p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-lg">
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              ref={iframeRef}
              className="w-full h-[400px] border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          {/* Contact Information Overlay */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Visit Us</h3>
            <p className="text-sm text-gray-600 mb-2">{address}</p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-green-600 hover:text-green-700"
            >
              Get Directions
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
} 