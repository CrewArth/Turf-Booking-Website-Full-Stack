'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { format, addDays, parseISO } from 'date-fns';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Slot {
  _id: string;
  time: string;
  price: number;
  totalCapacity: number;
  isNight: boolean;
  isEnabled: boolean;
  date: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

export default function AdminSlotsPage() {
  const { user } = useUser();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    price: 0,
    totalCapacity: 3,
    isNight: false,
    isEnabled: true,
  });
  const [bulkCreate, setBulkCreate] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    startTime: '06:00',
    endTime: '22:00',
    interval: 60,
    price: 1000,
    capacity: 3,
  });
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    time: '',
    price: 0,
    totalCapacity: 0,
  });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      console.log('Fetching slots...');
      const response = await fetch('/api/slots');
      
      if (!response.ok) {
        throw new Error('Failed to fetch slots');
      }
      
      const data = await response.json();
      console.log('Slots data:', {
        count: data.length,
        sample: data[0] ? {
          id: data[0]._id,
          time: data[0].time,
          date: data[0].date,
          enabled: data[0].isEnabled
        } : null
      });
      
      // Sort slots by date and time
      const sortedSlots = Array.isArray(data) ? data.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare === 0) {
          return a.time.localeCompare(b.time);
        }
        return dateCompare;
      }) : [];
      
      setSlots(sortedSlots);

      // Extract unique dates and sort them
      const uniqueDates = Array.from(new Set(sortedSlots.map(slot => slot.date))).sort();
      setAvailableDates(uniqueDates);
      
      // Set the first date as selected if there are dates available
      if (uniqueDates.length > 0 && !selectedDate) {
        setSelectedDate(uniqueDates[0]);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      toast.error('Failed to fetch slots. Please try again.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSlot),
      });

      if (!response.ok) {
        throw new Error('Failed to create slot');
      }

      fetchSlots();
      setNewSlot({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '',
        price: 0,
        totalCapacity: 3,
        isNight: false,
        isEnabled: true,
      });
    } catch (error) {
      console.error('Failed to create slot:', error);
      alert('Failed to create slot. Please try again.');
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/slots/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkCreate),
      });

      if (!response.ok) {
        throw new Error('Failed to create slots');
      }

      const data = await response.json();
      alert(data.message);
      fetchSlots();
    } catch (error) {
      console.error('Failed to create slots:', error);
      alert('Failed to create slots. Please try again.');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/slots?slotId=${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete slot');
      }

      alert('Slot deleted successfully');
      fetchSlots();
    } catch (error) {
      console.error('Failed to delete slot:', error);
      alert('Failed to delete slot. Please try again.');
    }
  };

  const handleDeleteAllSlots = async () => {
    if (!confirm('Are you sure you want to delete ALL slots? This action cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch('/api/slots?deleteAll=true', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete all slots');
      }

      alert('All slots deleted successfully');
      fetchSlots();
    } catch (error) {
      console.error('Failed to delete all slots:', error);
      alert('Failed to delete all slots. Please try again.');
    }
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      const response = await fetch(`/api/slots/${selectedSlot._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update slot');
      }

      setSlots(slots.map(slot => 
        slot._id === selectedSlot._id ? { ...slot, ...updateForm } : slot
      ));
      setShowUpdateModal(false);
      toast.success('Slot updated successfully');
    } catch (error) {
      console.error('Error updating slot:', error);
      toast.error('Failed to update slot');
    }
  };

  const openUpdateModal = (slot: Slot) => {
    setSelectedSlot(slot);
    setUpdateForm({
      time: slot.time,
      price: slot.price,
      totalCapacity: slot.totalCapacity,
    });
    setShowUpdateModal(true);
    setOpenDropdownId(null);
  };

  // Filter slots for selected date
  const filteredSlots = selectedDate
    ? slots.filter(slot => slot.date === selectedDate)
    : slots;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Slots</h1>
          <p className="mt-1 text-sm text-gray-600">Create and manage booking slots</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin/scan" 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Scan Tickets
          </Link>
          <Link 
            href="/admin/manage" 
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Add Admin
          </Link>
          <button
            onClick={handleDeleteAllSlots}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete All Slots
          </button>
        </div>
      </div>

      {/* Create New Slot Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Slot</h2>
        <form onSubmit={handleCreateSlot}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                value={newSlot.time}
                onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input
                type="number"
                value={newSlot.price}
                onChange={(e) => setNewSlot({ ...newSlot, price: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Capacity</label>
              <input
                type="number"
                value={newSlot.totalCapacity}
                onChange={(e) => setNewSlot({ ...newSlot, totalCapacity: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="1"
              />
            </div>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSlot.isNight}
                  onChange={(e) => setNewSlot({ ...newSlot, isNight: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Night Slot</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSlot.isEnabled}
                  onChange={(e) => setNewSlot({ ...newSlot, isEnabled: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 font-medium"
              >
                Create Slot
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bulk Create Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Bulk Create Slots</h2>
        <form onSubmit={handleBulkCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={bulkCreate.startDate}
                onChange={(e) => setBulkCreate({ ...bulkCreate, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={bulkCreate.endDate}
                onChange={(e) => setBulkCreate({ ...bulkCreate, endDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min={bulkCreate.startDate}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={bulkCreate.startTime}
                onChange={(e) => setBulkCreate({ ...bulkCreate, startTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={bulkCreate.endTime}
                onChange={(e) => setBulkCreate({ ...bulkCreate, endTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Interval (minutes)</label>
              <input
                type="number"
                value={bulkCreate.interval}
                onChange={(e) => setBulkCreate({ ...bulkCreate, interval: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="30"
                step="30"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input
                type="number"
                value={bulkCreate.price}
                onChange={(e) => setBulkCreate({ ...bulkCreate, price: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Capacity per slot</label>
              <input
                type="number"
                value={bulkCreate.capacity}
                onChange={(e) => setBulkCreate({ ...bulkCreate, capacity: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                min="1"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 font-medium"
              >
                Create Slots
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Slots Grid */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Available Slots</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-48 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Dates</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {format(parseISO(date), 'MMM d, yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSlots.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">
                {selectedDate 
                  ? 'No slots available for the selected date.' 
                  : 'No slots available. Create some slots to get started.'}
              </p>
            </div>
          ) : (
            filteredSlots.map((slot) => (
              <div
                key={slot._id}
                className={`bg-white rounded-lg shadow-md overflow-hidden border relative ${
                  slot.isEnabled ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {format(parseISO(slot.date), 'MMM d, yyyy')}
                      </h3>
                      <p className="text-base text-gray-600">
                        {formatTime(slot.time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {slot.isNight ? 'Night Slot' : 'Day Slot'}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === slot._id ? null : slot._id)}
                        className="p-1.5 hover:bg-gray-100 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {openDropdownId === slot._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => openUpdateModal(slot)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Update Details
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot._id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Delete Slot
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-gray-900">₹{slot.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium text-gray-900">{slot.totalCapacity}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${slot.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {slot.isEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Update Slot</h2>
            <form onSubmit={handleUpdateSlot}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  value={updateForm.time}
                  onChange={(e) => setUpdateForm({ ...updateForm, time: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                <input
                  type="number"
                  value={updateForm.price}
                  onChange={(e) => setUpdateForm({ ...updateForm, price: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                  min="0"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Total Capacity</label>
                <input
                  type="number"
                  value={updateForm.totalCapacity}
                  onChange={(e) => setUpdateForm({ ...updateForm, totalCapacity: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 