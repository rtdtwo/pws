import type { TemperatureUnit } from "@/types/weather";

export function celsiusToFahrenheit(
    celsius: number,
): number {
    return (celsius * 9) / 5 + 32;
}

export function convertTemperature(
    celsius: number,
    unit: TemperatureUnit,
): number {
    return unit === "fahrenheit"
        ? celsiusToFahrenheit(celsius)
        : celsius;
}

export function temperatureUnitLabel(
    unit: TemperatureUnit,
): string {
    return unit === "fahrenheit" ? "°F" : "°C";
}

export function getChartRange(
    values: number[],
    padding: number,
) {
    if (values.length === 0) {
        return {
            min: undefined,
            max: undefined,
        };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
        min: Math.floor(min - padding),
        max: Math.ceil(max + padding),
    };
}