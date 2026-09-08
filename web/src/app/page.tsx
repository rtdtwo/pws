"use client";

import { useEffect, useState } from "react";
import {
  Container,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import {
  IconDroplets,
  IconGauge,
  IconSun,
  IconTemperature,
  IconTemperatureMinus,
  IconTemperaturePlus,
} from "@tabler/icons-react";

import { HistoryChart } from "@/components/HistoryChart";
import { WeatherFooter } from "@/components/WeatherFooter";
import { WeatherCard } from "@/components/WeatherCard";
import { WeatherHeader } from "@/components/WeatherHeader";

import {
  convertTemperature,
  temperatureUnitLabel,
  getChartRange
} from "@/lib/weather";

import type {
  ChartDataPoint,
  SensorData,
  SensorHistory,
  TemperatureUnit
} from "@/types/weather";

export default function Home() {
  const [data, setData] =
    useState<SensorData | null>(null);

  const [history, setHistory] =
    useState<SensorHistory[]>([]);

  const [error, setError] = useState(false);

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>("celsius");

  useEffect(() => {
    const savedUnit =
      localStorage.getItem("temperatureUnit");

    if (
      savedUnit === "celsius" ||
      savedUnit === "fahrenheit"
    ) {
      setTemperatureUnit(savedUnit);
    }
  }, []);

  function handleTemperatureUnitChange(
    unit: TemperatureUnit,
  ) {
    setTemperatureUnit(unit);
    localStorage.setItem("temperatureUnit", unit);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [latestResponse, historyResponse] =
          await Promise.all([
            fetch("/api/sensor-data/latest"),
            fetch("/api/sensor-data/history"),
          ]);

        if (!latestResponse.ok) {
          throw new Error(
            "Failed to fetch latest sensor data",
          );
        }

        if (!historyResponse.ok) {
          throw new Error(
            "Failed to fetch sensor history",
          );
        }

        const sensorData: SensorData =
          await latestResponse.json();

        const sensorHistory: SensorHistory[] =
          await historyResponse.json();

        setData(sensorData);
        setHistory(sensorHistory);
        setError(false);
      } catch (err) {
        console.error(err);
        setError(true);
      }
    }

    loadData();

    const interval = setInterval(
      loadData,
      60_000,
    );

    return () => clearInterval(interval);
  }, []);

  const temperatureUnitLabelValue =
    temperatureUnitLabel(temperatureUnit);

  const displayTemperature =
    data === null
      ? null
      : convertTemperature(
        data.temperature,
        temperatureUnit,
      );

  const displayDewPoint =
    data === null
      ? null
      : convertTemperature(
        data.dewPoint,
        temperatureUnit,
      );

  const displayHeatIndex =
    data?.heatIndex === null ||
      data?.heatIndex === undefined
      ? null
      : convertTemperature(
        data.heatIndex,
        temperatureUnit,
      );

  const temperatureColor =
    data === null
      ? "gray"
      : data.temperature > 30
        ? "red"
        : data.temperature < 10
          ? "blue"
          : "teal";

  const temperatureIcon =
    data === null ? (
      <IconTemperature size={26} />
    ) : data.temperature > 30 ? (
      <IconTemperaturePlus size={26} />
    ) : data.temperature < 10 ? (
      <IconTemperatureMinus size={26} />
    ) : (
      <IconTemperature size={26} />
    );

  const chartData: ChartDataPoint[] =
    history.map((reading) => ({
      time: new Date(
        reading.timestamp,
      ).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),

      temperature: Number(
        convertTemperature(
          reading.temperature,
          temperatureUnit,
        ).toFixed(1),
      ),

      dewPoint: Number(
        convertTemperature(
          reading.dewPoint,
          temperatureUnit,
        ).toFixed(1),
      ),

      humidity: Number(
        reading.humidity.toFixed(1),
      ),

      pressure: Number(
        reading.pressure.toFixed(1),
      ),

      heatIndex:
        reading.heatIndex === null
          ? null
          : Number(
            convertTemperature(
              reading.heatIndex,
              temperatureUnit,
            ).toFixed(1),
          ),
    }));

  const temperatureRange = getChartRange(
    chartData.flatMap((reading) => [
      reading.temperature,
      reading.dewPoint,
    ]),
    10,
  );

  const pressureRange = getChartRange(
    chartData.map((reading) => reading.pressure),
    10,
  );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">

        {/* Header */}
        <WeatherHeader
          error={error}
          hasData={data !== null}
          temperatureUnit={temperatureUnit}
          onTemperatureUnitChange={
            handleTemperatureUnitChange
          }
        />

        {/* Current conditions */}
        {data && (
          <SimpleGrid
            cols={{ base: 1, xs: 2, md: 3 }}
            spacing="lg"
          >
            <WeatherCard
              title="Temperature"
              value={`${displayTemperature?.toFixed(1)}${temperatureUnitLabelValue}`}
              color={temperatureColor}
              icon={temperatureIcon}
            />

            <WeatherCard
              title="Humidity"
              value={`${data.humidity.toFixed(1)}%`}
              color="cyan"
              icon={<IconDroplets size={26} />}
            />

            <WeatherCard
              title="Pressure"
              value={`${data.pressure.toFixed(1)} hPa`}
              color="violet"
              icon={<IconGauge size={26} />}
            />

            <WeatherCard
              title="Dew Point"
              value={`${displayDewPoint?.toFixed(1)}${temperatureUnitLabelValue}`}
              color={temperatureColor}
              icon={<IconDroplets size={26} />}
            />

            {displayHeatIndex !== null && (
              <WeatherCard
                title="Heat Index"
                value={`${displayHeatIndex.toFixed(1)}${temperatureUnitLabelValue}`}
                color="orange"
                icon={<IconSun size={26} />}
              />
            )}
          </SimpleGrid>
        )}

        {/* Temperature history */}
        {history.length > 0 && (
          <>
            <HistoryChart
              title="Temperature — Last 24 Hours"
              description="Air temperature and dew point"
              data={chartData}
              series={[
                {
                  name: "temperature",
                  label: "Temperature",
                  color: "red",
                },
                {
                  name: "dewPoint",
                  label: "Dew Point",
                  color: "orange",
                },
              ]}
              unit={temperatureUnitLabelValue}
              yMin={temperatureRange.min}
              yMax={temperatureRange.max}
            />

            <HistoryChart
              title="Humidity — Last 24 Hours"
              description="Relative humidity"
              data={chartData}
              series={[
                {
                  name: "humidity",
                  label: "Humidity",
                  color: "cyan",
                },
              ]}
              unit="%"
              yMin={0}
              yMax={100}
            />

            <HistoryChart
              title="Pressure — Last 24 Hours"
              description="Station Level Atmospheric Pressure"
              data={chartData}
              series={[
                {
                  name: "pressure",
                  label: "Pressure",
                  color: "violet",
                },
              ]}
              unit="hPa"
              yMin={pressureRange.min}
              yMax={pressureRange.max}
            />
          </>
        )}

        {data && (
          <WeatherFooter last_updated={data.timestamp} />
        )}
      </Stack>
    </Container>
  );
}