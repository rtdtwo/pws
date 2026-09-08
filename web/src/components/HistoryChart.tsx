import {
    Card,
    Group,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import { LineChart } from "@mantine/charts";
import type { ChartDataPoint } from "@/types/weather";

type ChartSeries = {
    name: string;
    label: string;
    color: string;
};

type HistoryChartProps = {
    title: string;
    description: string;
    data: ChartDataPoint[];
    series: ChartSeries[];
    unit: string;
    yMin?: number;
    yMax?: number;
};

export function HistoryChart({
    title,
    description,
    data,
    series,
    unit,
    yMin,
    yMax,
}: HistoryChartProps) {
    return (
        <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
                <div>
                    <Title order={2}>{title}</Title>

                    <Text size="sm" c="dimmed" mt={4}>
                        {description}
                    </Text>
                </div>

                <Group gap="lg">
                    {series.map((item) => (
                        <Group key={item.name} gap={6}>
                            <div
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor:
                                        `var(--mantine-color-${item.color}-6)`,
                                }}
                            />

                            <Text size="sm" c="dimmed">
                                {item.label}
                            </Text>
                        </Group>
                    ))}
                </Group>

                <LineChart
                    h={320}
                    data={data}
                    dataKey="time"
                    series={series}
                    curveType="monotone"
                    withTooltip
                    tooltipProps={{
                        content: ({ label, payload }) => (
                            <Card
                                withBorder
                                shadow="sm"
                                radius="md"
                                p="sm"
                            >
                                <Text size="xs" c="dimmed" mb={6}>
                                    {label}
                                </Text>

                                <Stack gap={4}>
                                    {payload?.map((entry, index) => (
                                        <Group
                                            key={index}
                                            gap="xs"
                                            justify="space-between"
                                        >
                                            <Group gap={6}>
                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: "50%",
                                                        backgroundColor:
                                                            entry.color ??
                                                            "var(--mantine-color-gray-6)",
                                                    }}
                                                />

                                                <Text size="sm">
                                                    {entry.name}
                                                </Text>
                                            </Group>

                                            <Text size="sm" fw={600}>
                                                {entry.value} {unit}
                                            </Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </Card>
                        ),
                    }}
                    withDots={false}
                    tickLine="y"
                    gridAxis="y"
                    valueFormatter={(value) =>
                        `${value} ${unit}`
                    }
                    yAxisProps={{
                        domain: [yMin ?? "auto", yMax ?? "auto"],
                    }}
                />
            </Stack>
        </Card>
    );
}