'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function Hero() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="relative bg-white h-screen flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.jpg"
          alt="Cricket ground"
          fill
          className="object-cover opacity-30"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Book Your Perfect
            <span className="text-green-600"> Cricket Turf</span>
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Experience premium cricket facilities at your convenience. Book your slot now and play at the best turfs in town.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {isLoaded && (
              isSignedIn ? (
                <Link
                  href="/book"
                  className="bg-green-600 text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-green-700 transition duration-300"
                >
                  Book Now
                </Link>
              ) : (
                <SignInButton mode="modal">
                  <button className="bg-green-600 text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-green-700 transition duration-300">
                    Sign In to Book
                  </button>
                </SignInButton>
              )
            )}
            <Link
              href="#contact"
              className="bg-gray-100 text-gray-900 px-8 py-3 rounded-md text-lg font-semibold hover:bg-gray-200 transition duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 