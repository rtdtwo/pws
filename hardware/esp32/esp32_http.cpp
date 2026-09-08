```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_DPS310.h>
#include <time.h>
#include <math.h>

// ============================================================
// USER CONFIGURATION
// ============================================================

// ------------------------
// WiFi
// ------------------------

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ------------------------
// Next.js API
// ------------------------

// Example:
// http://192.168.1.100:3000/api/sensor-data
//
// If your Next.js server uses HTTPS, use https:// instead.

const char* API_URL =
  "http://YOUR_NEXTJS_SERVER_HOSTNAME:3000/api/sensor-data";

// ------------------------
// Time / NTP
// ------------------------

// NTP server
const char* NTP_SERVER = "pool.ntp.org";

// US Eastern time.
// Change this if your weather station is somewhere else.
//
// Examples:
// US Eastern:  EST5EDT
// US Central:  CST6CDT
// US Mountain: MST7MDT
// US Pacific:  PST8PDT
const char* TIME_ZONE = "EST5EDT";


// ============================================================
// SENSOR CONFIGURATION
// ============================================================

// ------------------------
// DHT22
// ------------------------

#define DHTPIN 13
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);


// ------------------------
// DPS310
// ------------------------

Adafruit_DPS310 dps;

#define SDA_PIN 32
#define SCL_PIN 33

bool dpsFound = false;


// ============================================================
// TIMING
// ============================================================

const unsigned long READING_INTERVAL_MS = 60000UL;

unsigned long lastReadingMillis = 0;


// ============================================================
// HEAT INDEX CONFIGURATION
// ============================================================

// Per our agreed behavior:
//
// Below 80°F / 26.67°C:
//     heat_index = NULL
//
// At or above 80°F:
//     use NOAA/NWS heat index calculation.

const float HEAT_INDEX_THRESHOLD_F = 80.0;


// ============================================================
// WIFI
// ============================================================

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.print("Connecting to WiFi");

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected.");

  Serial.print("ESP32 IP address: ");
  Serial.println(WiFi.localIP());
}


// ============================================================
// NTP / TIMESTAMP
// ============================================================

void initializeTime() {

  Serial.println(
    "Synchronizing time with NTP..."
  );

  configTzTime(
    TIME_ZONE,
    NTP_SERVER
  );

  struct tm timeinfo;

  if (getLocalTime(&timeinfo, 10000)) {

    Serial.println(
      "NTP time synchronized."
    );

  } else {

    Serial.println(
      "WARNING: NTP synchronization failed."
    );
  }
}


String getTimestamp() {

  struct tm timeinfo;

  if (!getLocalTime(&timeinfo, 1000)) {
    return "";
  }

  char buffer[32];

  strftime(
    buffer,
    sizeof(buffer),
    "%Y-%m-%dT%H:%M:%S%z",
    &timeinfo
  );

  return String(buffer);
}


// ============================================================
// DEW POINT
// ============================================================
//
// Magnus formulation.
//
// T  = temperature in °C
// RH = relative humidity in %
//
// Returns dew point in °C.
// ============================================================

float calculateDewPoint(
  float temperatureC,
  float humidity
) {

  const float A = 17.62;
  const float B = 243.12;

  // Avoid invalid logarithm values.

  if (humidity <= 0.0) {
    return NAN;
  }

  float gamma =
    log(humidity / 100.0) +
    (A * temperatureC) /
    (B + temperatureC);

  float dewPoint =
    (B * gamma) /
    (A - gamma);

  return dewPoint;
}


// ============================================================
// NOAA / NWS HEAT INDEX
// ============================================================
//
// Input:
//   temperatureC = air temperature in °C
//   humidity     = relative humidity in %
//
// Output:
//   heat index in °C
//
// Returns NAN when temperature is below 80°F,
// which will be serialized as JSON null.
//
// NOAA/NWS methodology:
//   1. Convert temperature to Fahrenheit.
//   2. If below 80°F, return NULL per our project rule.
//   3. Calculate the preliminary/simple heat index.
//   4. If the preliminary result is < 80°F, use it.
//   5. Otherwise use the Rothfusz regression.
//   6. Apply NWS low-RH adjustment.
//   7. Apply NWS high-RH adjustment.
//   8. Convert result back to Celsius.
// ============================================================

float calculateHeatIndex(
  float temperatureC,
  float humidity
) {

  float temperatureF =
    temperatureC * 9.0 / 5.0 + 32.0;


  // ----------------------------------------------------------
  // Our project rule:
  //
  // No heat index below 80°F.
  // ----------------------------------------------------------

  if (temperatureF < HEAT_INDEX_THRESHOLD_F) {
    return NAN;
  }


  // ----------------------------------------------------------
  // NOAA/NWS simple heat index equation
  // ----------------------------------------------------------

  float simpleHI =
    0.5 *
    (
      temperatureF
      + 61.0
      + ((temperatureF - 68.0) * 1.2)
      + (humidity * 0.094)
    );


  // NWS practice averages the simple HI with
  // the actual temperature.

  float preliminaryHI =
    (simpleHI + temperatureF) / 2.0;


  // ----------------------------------------------------------
  // If preliminary HI is below 80°F, use it.
  // ----------------------------------------------------------

  if (preliminaryHI < 80.0) {

    return
      (preliminaryHI - 32.0) * 5.0 / 9.0;
  }


  // ----------------------------------------------------------
  // Rothfusz regression
  // ----------------------------------------------------------

  float T  = temperatureF;
  float RH = humidity;

  float HI =
    -42.379
    + 2.04901523 * T
    + 10.14333127 * RH
    - 0.22475541 * T * RH
    - 0.00683783 * T * T
    - 0.05481717 * RH * RH
    + 0.00122874 * T * T * RH
    + 0.00085282 * T * RH * RH
    - 0.00000199 * T * T * RH * RH;


  // ----------------------------------------------------------
  // Low humidity adjustment
  //
  // RH < 13%
  // Temperature between 80°F and 112°F
  // ----------------------------------------------------------

  if (
    RH < 13.0 &&
    T >= 80.0 &&
    T <= 112.0
  ) {

    float adjustment =
      ((13.0 - RH) / 4.0) *
      sqrt(
        (17.0 - fabs(T - 95.0)) / 17.0
      );

    HI -= adjustment;
  }


  // ----------------------------------------------------------
  // High humidity adjustment
  //
  // RH > 85%
  // Temperature between 80°F and 87°F
  // ----------------------------------------------------------

  if (
    RH > 85.0 &&
    T >= 80.0 &&
    T <= 87.0
  ) {

    float adjustment =
      ((RH - 85.0) / 10.0) *
      ((87.0 - T) / 5.0);

    HI += adjustment;
  }


  // ----------------------------------------------------------
  // Convert Fahrenheit -> Celsius
  // ----------------------------------------------------------

  float heatIndexC =
    (HI - 32.0) * 5.0 / 9.0;

  return heatIndexC;
}


// ============================================================
// BUILD JSON PAYLOAD
// ============================================================
//
// The payload is sent to the Next.js API.
//
// heat_index becomes JSON null when NAN.
// ============================================================

String buildPayload(
  float temperature,
  float humidity,
  float pressure,
  float dewPoint,
  float heatIndex,
  String timestamp
) {

  String payload = "{";

  payload += "\"temperature\":";
  payload += String(temperature, 2);

  payload += ",\"humidity\":";
  payload += String(humidity, 2);

  payload += ",\"pressure\":";
  payload += String(pressure, 2);

  payload += ",\"dew_point\":";
  payload += String(dewPoint, 2);

  payload += ",\"heat_index\":";

  if (isnan(heatIndex)) {

    payload += "null";

  } else {

    payload += String(heatIndex, 2);
  }

  payload += ",\"timestamp\":\"";
  payload += timestamp;
  payload += "\"";

  payload += "}";

  return payload;
}


// ============================================================
// HTTP POST
// ============================================================

void postToNextJS(
  const String& payload
) {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println(
      "ERROR: WiFi unavailable. "
      "Skipping HTTP POST."
    );

    return;
  }

  HTTPClient http;

  Serial.println(
    "Sending HTTP POST to Next.js..."
  );

  http.begin(API_URL);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  int httpCode =
    http.POST(payload);

  if (httpCode > 0) {

    Serial.print(
      "HTTP response code: "
    );

    Serial.println(httpCode);

    String response =
      http.getString();

    Serial.print(
      "Server response: "
    );

    Serial.println(response);

  } else {

    Serial.print(
      "HTTP POST failed: "
    );

    Serial.println(
      http.errorToString(httpCode)
    );
  }

  http.end();
}


// ============================================================
// READ SENSORS
// ============================================================

void takeSensorReading() {

  Serial.println();
  Serial.println("==============================");
  Serial.println("Taking sensor reading...");
  Serial.println("==============================");


  // ----------------------------------------------------------
  // DHT22
  // ----------------------------------------------------------

  float temperature =
    dht.readTemperature();

  float humidity =
    dht.readHumidity();


  if (
    isnan(temperature) ||
    isnan(humidity)
  ) {

    Serial.println(
      "ERROR: Failed to read DHT22."
    );

    return;
  }


  // ----------------------------------------------------------
  // DPS310
  // ----------------------------------------------------------

  float pressure = NAN;


  if (dpsFound) {

    sensors_event_t tempEvent;
    sensors_event_t pressureEvent;


    if (
      dps.temperatureAvailable() &&
      dps.pressureAvailable()
    ) {

      Adafruit_Sensor* tempSensor =
        dps.getTemperatureSensor();

      Adafruit_Sensor* pressureSensor =
        dps.getPressureSensor();


      tempSensor->getEvent(
        &tempEvent
      );

      pressureSensor->getEvent(
        &pressureEvent
      );


      // IMPORTANT:
      //
      // We deliberately ignore tempEvent.temperature.
      //
      // DHT22 is our outdoor air temperature sensor.
      // DPS310 temperature is used internally by the
      // sensor for pressure compensation.

      pressure =
        pressureEvent.pressure;

    } else {

      Serial.println(
        "ERROR: DPS310 data unavailable."
      );

      return;
    }

  } else {

    Serial.println(
      "ERROR: DPS310 not found."
    );

    return;
  }


  // ----------------------------------------------------------
  // Validate pressure
  // ----------------------------------------------------------

  if (isnan(pressure)) {

    Serial.println(
      "ERROR: Invalid pressure reading."
    );

    return;
  }


  // ----------------------------------------------------------
  // Calculate dew point
  // ----------------------------------------------------------

  float dewPoint =
    calculateDewPoint(
      temperature,
      humidity
    );


  // ----------------------------------------------------------
  // Calculate heat index
  // ----------------------------------------------------------

  float heatIndex =
    calculateHeatIndex(
      temperature,
      humidity
    );


  // ----------------------------------------------------------
  // Timestamp
  // ----------------------------------------------------------

  String timestamp =
    getTimestamp();


  if (timestamp.length() == 0) {

    Serial.println(
      "WARNING: No valid NTP time."
    );

    timestamp =
      "1970-01-01T00:00:00+0000";
  }


  // ----------------------------------------------------------
  // Build payload
  // ----------------------------------------------------------

  String payload =
    buildPayload(
      temperature,
      humidity,
      pressure,
      dewPoint,
      heatIndex,
      timestamp
    );


  // ----------------------------------------------------------
  // Serial output
  // ----------------------------------------------------------

  Serial.println();

  Serial.print("Temperature: ");
  Serial.print(temperature, 2);
  Serial.println(" °C");

  Serial.print("Humidity: ");
  Serial.print(humidity, 2);
  Serial.println(" %");

  Serial.print("Pressure: ");
  Serial.print(pressure, 2);
  Serial.println(" hPa");

  Serial.print("Dew point: ");
  Serial.print(dewPoint, 2);
  Serial.println(" °C");

  if (isnan(heatIndex)) {

    Serial.println(
      "Heat index: NULL"
    );

  } else {

    Serial.print("Heat index: ");
    Serial.print(heatIndex, 2);
    Serial.println(" °C");
  }

  Serial.print("Timestamp: ");
  Serial.println(timestamp);

  Serial.println();
  Serial.println("JSON payload:");
  Serial.println(payload);


  // ----------------------------------------------------------
  // Next.js
  // ----------------------------------------------------------

  postToNextJS(payload);


  Serial.println("==============================");
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("ESP32 Outdoor Weather Station");
  Serial.println("HTTP-only mode");
  Serial.println("================================");


  // ----------------------------------------------------------
  // DHT22
  // ----------------------------------------------------------

  dht.begin();

  Serial.println(
    "DHT22 initialized."
  );


  // ----------------------------------------------------------
  // I2C
  // ----------------------------------------------------------

  Wire.begin(
    SDA_PIN,
    SCL_PIN
  );

  Serial.print("I2C SDA: ");
  Serial.println(SDA_PIN);

  Serial.print("I2C SCL: ");
  Serial.println(SCL_PIN);


  // ----------------------------------------------------------
  // DPS310
  // ----------------------------------------------------------

  if (dps.begin_I2C()) {

    dpsFound = true;

    Serial.println(
      "DPS310 found."
    );


    dps.configurePressure(
      DPS310_64HZ,
      DPS310_64SAMPLES
    );

    dps.configureTemperature(
      DPS310_64HZ,
      DPS310_64SAMPLES
    );

  } else {

    Serial.println(
      "ERROR: DPS310 not found."
    );
  }


  // ----------------------------------------------------------
  // WiFi
  // ----------------------------------------------------------

  connectWiFi();


  // ----------------------------------------------------------
  // NTP
  // ----------------------------------------------------------

  initializeTime();


  // ----------------------------------------------------------
  // First reading
  // ----------------------------------------------------------

  Serial.println();
  Serial.println(
    "Taking initial reading..."
  );

  takeSensorReading();

  lastReadingMillis = millis();


  Serial.println();
  Serial.println(
    "Weather station ready."
  );
}


// ============================================================
// LOOP
// ============================================================

void loop() {

  // ----------------------------------------------------------
  // WiFi
  // ----------------------------------------------------------

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }


  // ----------------------------------------------------------
  // One reading every minute
  // ----------------------------------------------------------

  unsigned long currentMillis =
    millis();

  if (
    currentMillis - lastReadingMillis >=
    READING_INTERVAL_MS
  ) {

    lastReadingMillis =
      currentMillis;

    takeSensorReading();
  }


  delay(100);
}
```
