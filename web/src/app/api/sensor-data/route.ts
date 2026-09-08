import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const temperature = Number(body.temperature);
        const humidity = Number(body.humidity);
        const pressure = Number(body.pressure);
        const dewPoint = Number(body.dew_point);

        const heatIndex =
            body.heat_index === null || body.heat_index === undefined
                ? null
                : Number(body.heat_index);

        // Validate required numeric values.
        if (
            !Number.isFinite(temperature) ||
            !Number.isFinite(humidity) ||
            !Number.isFinite(pressure) ||
            !Number.isFinite(dewPoint)
        ) {
            return NextResponse.json(
                {
                    error:
                        "temperature, humidity, pressure, and dew_point must be valid numbers",
                },
                { status: 400 },
            );
        }

        // Validate optional heat index.
        if (heatIndex !== null && !Number.isFinite(heatIndex)) {
            return NextResponse.json(
                {
                    error: "heat_index must be a number or null",
                },
                { status: 400 },
            );
        }

        // Validate humidity range.
        if (humidity < 0 || humidity > 100) {
            return NextResponse.json(
                {
                    error: "humidity must be between 0 and 100",
                },
                { status: 400 },
            );
        }

        // Validate temperature
        if (temperature < -100 || temperature > 60) {
            return NextResponse.json(
                {
                    error: "temperature must be between -100°C and 60°C",
                },
                { status: 400 },
            );
        }

        // Validate pressure range.
        if (pressure < 800 || pressure > 1200) {
            return NextResponse.json(
                {
                    error: "pressure must be between 800 and 1200 hPa",
                },
                { status: 400 },
            );
        }

        const sensorData = await prisma.sensorData.create({
            data: {
                temperature,
                humidity,
                pressure,
                dewPoint,
                heatIndex,
                timestamp: new Date(),
            },
        });

        return NextResponse.json(sensorData, { status: 201 });
    } catch (error) {
        console.error("Failed to save sensor data:", error);

        return NextResponse.json(
            {
                error: "Failed to save sensor data",
            },
            { status: 500 },
        );
    }
}