'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'react-hot-toast';

interface TicketData {
  ticketNumber: string;
  bookingId: string;
  userId: string;
  date: string;
  time: string;
  amount: number;
  bothTurfs: boolean;
}

interface VerificationResult {
  isValid: boolean;
  ticket?: {
    ticketNumber: string;
    bookingId: {
      date: string;
      slotId: {
        time: string;
        price: number;
      };
      userId: string;
      status: string;
      bothTurfs: boolean;
    };
    createdAt: string;
    isUsed?: boolean;
  };
  message: string;
}

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // Create scanner instance
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      false
    );

    const handleScanSuccess = async (decodedText: string) => {
      try {
        setIsScanning(false);
        scanner.pause();

        // Parse the QR code data
        const ticketData: TicketData = JSON.parse(decodedText);

        // Verify the ticket with your API
        const response = await fetch('/api/tickets/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticketNumber: ticketData.ticketNumber }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to verify ticket');
        }

        setScanResult(result);
        toast.success('Ticket scanned successfully');
      } catch (error) {
        console.error('Error verifying ticket:', error);
        toast.error('Failed to verify ticket. Please try again.');
        setScanResult({
          isValid: false,
          message: error instanceof Error ? error.message : 'Failed to verify ticket',
        });
      }
    };

    const handleScanError = (error: any) => {
      console.error('QR Scan error:', error);
    };

    scanner.render(handleScanSuccess, handleScanError);

    // Cleanup
    return () => {
      scanner.clear();
    };
  }, []);

  const handleReset = () => {
    setScanResult(null);
    setIsScanning(true);
    window.location.reload(); // Refresh to restart scanner
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Scan Ticket QR Code</h1>

          {isScanning && (
            <div className="mb-6">
              <div id="qr-reader" className="w-full max-w-lg mx-auto"></div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Position the QR code within the frame to scan
              </p>
            </div>
          )}

          {scanResult && (
            <div className={`border rounded-lg p-6 ${
              scanResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Ticket Verification Result
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  scanResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {scanResult.isValid ? 'Valid Ticket' : 'Invalid Ticket'}
                </span>
              </div>

              {scanResult.isValid && scanResult.ticket ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Ticket Number</p>
                    <p className="font-medium">{scanResult.ticket.ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Date</p>
                    <p className="font-medium">{formatDate(scanResult.ticket.bookingId.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time Slot</p>
                    <p className="font-medium">{formatTime(scanResult.ticket.bookingId.slotId.time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="font-medium">
                      ₹{scanResult.ticket.bookingId.bothTurfs 
                        ? scanResult.ticket.bookingId.slotId.price * 2 
                        : scanResult.ticket.bookingId.slotId.price}
                    </p>
                  </div>
                  {scanResult.ticket.bookingId.bothTurfs && (
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Both Turfs Booked</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`font-medium ${scanResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {scanResult.message}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-red-600">{scanResult.message}</p>
              )}

              <button
                onClick={handleReset}
                className="mt-6 w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                Scan Another Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 