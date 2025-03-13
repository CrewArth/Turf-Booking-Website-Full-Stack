'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const staticImages = [
  {
    id: 1,
    title: "Premium Cricket Turf",
    description: "Experience world-class cricket facilities at our premium turf.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852231/1.jpg"
  },
  {
    id: 2,
    title: "Professional Pitch",
    description: "Play on our professionally maintained cricket pitch.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852233/2.jpg"
  },
  {
    id: 3,
    title: "Modern Facilities",
    description: "State-of-the-art facilities for the best cricket experience.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852232/3.jpg"
  },
  {
    id: 4,
    title: "Practice Nets",
    description: "High-quality practice nets for perfect training sessions.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852233/4.jpg"
  },
  {
    id: 5,
    title: "Corporate Booking",
    description: "In teamwork, silence isnt golden. It's deadly.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852233/5.jpg"
  },
  {
    id: 6,
    title: "Tournament Ready",
    description: "Perfect venue for cricket tournaments and matches.",
    url: "https://res.cloudinary.com/duafanigh/image/upload/v1741852234/6.jpg",
  }
];

export default function Gallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % staticImages.length);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + staticImages.length) % staticImages.length);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handleDotClick = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <section id="gallery" className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Our Facilities</h2>
        <div className="relative">
          {/* Main Carousel */}
          <div className="relative h-[400px] md:h-[500px] lg:h-[600px] rounded-xl overflow-hidden shadow-2xl">
            {staticImages.map((image, index) => (
              <div
                key={image.id}
                className={`absolute inset-0 transform transition-all duration-1000 ease-in-out ${
                  index === currentIndex 
                    ? 'opacity-100 translate-x-0 scale-100' 
                    : index < currentIndex
                    ? 'opacity-0 -translate-x-full scale-95'
                    : 'opacity-0 translate-x-full scale-95'
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  priority
                  unoptimized={true}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-8 transform transition-all duration-700 delay-300">
                    <h3 className="text-3xl font-bold text-white mb-3">{image.title}</h3>
                    <p className="text-lg text-white/90">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all transform hover:scale-110 focus:outline-none"
            disabled={isAnimating}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all transform hover:scale-110 focus:outline-none"
            disabled={isAnimating}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots Navigation */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-3">
            {staticImages.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                disabled={isAnimating}
                className={`transition-all duration-300 focus:outline-none ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-green-600'
                    : 'w-2 h-2 bg-green-300 hover:bg-green-400'
                } rounded-full`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 