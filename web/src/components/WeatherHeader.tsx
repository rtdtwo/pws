import {
    Badge,
    Group,
    Text,
    Title,
} from "@mantine/core";
import { TemperatureUnitToggle } from "@/components/TemperatureUnitToggle";
import type { TemperatureUnit } from "@/types/weather";

type WeatherHeaderProps = {
    error: boolean;
    hasData: boolean;
    temperatureUnit: TemperatureUnit;
    onTemperatureUnitChange: (
        unit: TemperatureUnit,
    ) => void;
};

export function WeatherHeader({
    error,
    hasData,
    temperatureUnit,
    onTemperatureUnitChange,
}: WeatherHeaderProps) {
    return (
        <Group
            justify="space-between"
            align="flex-start"
        >
            <div>
                <Title order={1}>
                    Personal Weather Station
                </Title>

                <Text c="dimmed" mt={4}>
                    Marlinspike Hall, Belgium
                </Text>
            </div>

            <Group>
                <TemperatureUnitToggle
                    value={temperatureUnit}
                    onChange={onTemperatureUnitChange}
                />

                <Badge
                    size="lg"
                    variant="light"
                    color={
                        error
                            ? "red"
                            : hasData
                                ? "green"
                                : "gray"
                    }
                >
                    {error
                        ? "Offline"
                        : hasData
                            ? "Online"
                            : "Connecting..."}
                </Badge>
            </Group>
        </Group>
    );
}