import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const sensorData = await prisma.sensorData.findFirst({
            orderBy: {
                timestamp: "desc",
            },
        });

        if (!sensorData) {
            return NextResponse.json(
                { error: "No sensor data available" },
                { status: 404 },
            );
        }

        return NextResponse.json(sensorData);
    } catch (error) {
        console.error("Failed to fetch latest sensor data:", error);

        return NextResponse.json(
            { error: "Failed to fetch sensor data" },
            { status: 500 },
        );
    }
}