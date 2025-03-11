"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if admin token exists in cookies
    const hasAdminToken = document.cookie.includes('admin_token=true');
    setIsAdmin(hasAdminToken);
  }, []);

  const handleGalleryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAdmin) {
      e.preventDefault();
      const gallerySection = document.getElementById('gallery');
      if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMenuOpen(false); // Close menu after click
  };

  const handleContactClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false); // Close menu after click
  };

  // Function to close menu
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" onClick={closeMenu} className="flex items-center">
              <span className="text-xl font-bold text-gray-800">Turf 106</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <Link href="/" onClick={closeMenu} className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link 
              href={isAdmin ? "/admin/gallery" : "#gallery"}
              onClick={handleGalleryClick}
              className="text-gray-600 hover:text-gray-900"
            >
              Gallery
            </Link>
            <Link 
              href="#contact" 
              onClick={handleContactClick}
              className="text-gray-600 hover:text-gray-900"
            >
              Contact
            </Link>
            {isAdmin && (
              <Link
                href="/admin/slots"
                onClick={closeMenu}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Admin Panel
              </Link>
            )}
            {isLoaded && (
              isSignedIn ? (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/book"
                    onClick={closeMenu}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Book Now
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={closeMenu}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    My Bookings
                  </Link>
                  <div onClick={closeMenu}>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              ) : (
                <div onClick={closeMenu}>
                  <SignInButton mode="modal">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                      Login
                    </button>
                  </SignInButton>
                </div>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={closeMenu}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              Home
            </Link>
            <Link
              href={isAdmin ? "/admin/gallery" : "#gallery"}
              onClick={handleGalleryClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              Gallery
            </Link>
            <Link
              href="#contact"
              onClick={handleContactClick}
              className="block px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              Contact
            </Link>
            {isAdmin && (
              <Link
                href="/admin/slots"
                onClick={closeMenu}
                className="block px-3 py-2 text-green-600 hover:text-green-700 font-medium"
              >
                Admin Panel
              </Link>
            )}
            {isLoaded && (
              isSignedIn ? (
                <>
                  <Link
                    href="/book"
                    onClick={closeMenu}
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Book Now
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={closeMenu}
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                  >
                    My Bookings
                  </Link>
                  <div 
                    className="px-3 py-2" 
                    onClick={(e) => {
                      // Stop event propagation
                      e.stopPropagation();
                      // Don't close menu when clicking UserButton
                    }}
                  >
                    <div className="h-10 flex items-center">
                      <UserButton 
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            rootBox: "h-10",
                            avatarBox: "h-10 w-10",
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-3 py-2">
                  <SignInButton mode="modal">
                    <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                      Login
                    </button>
                  </SignInButton>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 