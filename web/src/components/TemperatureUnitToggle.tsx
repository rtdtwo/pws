import { SegmentedControl } from "@mantine/core";
import type { TemperatureUnit } from "@/types/weather";

type TemperatureUnitToggleProps = {
    value: TemperatureUnit;
    onChange: (value: TemperatureUnit) => void;
};

export function TemperatureUnitToggle({
    value,
    onChange,
}: TemperatureUnitToggleProps) {
    return (
        <SegmentedControl
            value={value}
            onChange={(value) =>
                onChange(value as TemperatureUnit)
            }
            data={[
                {
                    label: "°C",
                    value: "celsius",
                },
                {
                    label: "°F",
                    value: "fahrenheit",
                },
            ]}
        />
    );
}