import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const sensorData = await prisma.sensorData.findMany({
            where: {
                timestamp: {
                    gte: since,
                },
            },
            orderBy: {
                timestamp: "asc",
            },
            select: {
                temperature: true,
                humidity: true,
                pressure: true,
                dewPoint: true,
                heatIndex: true,
                timestamp: true,
            },
        });

        return NextResponse.json(sensorData);
    } catch (error) {
        console.error("Failed to fetch sensor history:", error);

        return NextResponse.json(
            { error: "Failed to fetch sensor history" },
            { status: 500 },
        );
    }
}