import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs";
import dbConnect from "@/lib/db";
import { Slot } from "@/models/Slot";
import { Booking } from "@/models/Booking";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { slotId, date, amount, bothTurfs } = await req.json();

    if (!slotId || !date || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify slot exists
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    // Check slot capacity
    const existingBookings = await Booking.find({ slotId, date });
    const requiredCapacity = bothTurfs ? 2 : 1;
    
    // Calculate total booked capacity considering both turfs
    const totalBookedCapacity = existingBookings.reduce((total, booking) => {
      return total + (booking.bothTurfs ? 2 : 1);
    }, 0);
    
    if (slot.totalCapacity - totalBookedCapacity < requiredCapacity) {
      return NextResponse.json(
        { error: bothTurfs ? "Both turfs are not available" : "Slot is fully booked" },
        { status: 400 }
      );
    }

    // Check if user already has a booking for this slot and date
    const userBooking = await Booking.findOne({
      userId,
      slotId,
      date,
      status: { $ne: "cancelled" },
    });

    if (userBooking) {
      return NextResponse.json(
        { error: "You already have a booking for this slot" },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      notes: {
        slotId,
        date,
        bothTurfs: bothTurfs ? "true" : "false",
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
} 