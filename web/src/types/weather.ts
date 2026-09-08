export type TemperatureUnit = "celsius" | "fahrenheit";

export type SensorData = {
  temperature: number;
  humidity: number;
  pressure: number;
  dewPoint: number;
  heatIndex: number | null;
  timestamp: string;
};

export type SensorHistory = {
  temperature: number;
  humidity: number;
  pressure: number;
  dewPoint: number;
  heatIndex: number | null;
  timestamp: string;
};

export type ChartDataPoint = {
  time: string;
  temperature: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  heatIndex: number | null;
};