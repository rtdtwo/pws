import {
    Card,
    Group,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";

type WeatherCardProps = {
    title: string;
    value: string;
    color: string;
    icon: React.ReactNode;
};

export function WeatherCard({
    title,
    value,
    color,
    icon,
}: WeatherCardProps) {
    return (
        <Card
            withBorder
            radius="md"
            padding="lg"
            style={{
                borderTop: `4px solid var(--mantine-color-${color}-6)`,
            }}
        >
            <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                    <Text size="sm" c="dimmed" fw={600}>
                        {title}
                    </Text>

                    <Text size="2rem" fw={700} lh={1.2}>
                        {value}
                    </Text>
                </Stack>

                <ThemeIcon
                    size={52}
                    radius="md"
                    variant="light"
                    color={color}
                >
                    {icon}
                </ThemeIcon>
            </Group>
        </Card>
    );
}