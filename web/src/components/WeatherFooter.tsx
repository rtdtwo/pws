import { Text } from "@mantine/core";

type FooterProps = {
    last_updated: string;
};

export function WeatherFooter({
    last_updated,
}: FooterProps) {
    return (
        <Text size="sm" c="dimmed">
            Last updated:{" "}
            {new Date(last_updated).toLocaleString()}
        </Text>
    );
}