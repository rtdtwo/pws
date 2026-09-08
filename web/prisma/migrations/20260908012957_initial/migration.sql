-- CreateTable
CREATE TABLE "sensor_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "temperature" REAL NOT NULL,
    "humidity" REAL NOT NULL,
    "pressure" REAL NOT NULL,
    "dew_point" REAL NOT NULL,
    "heat_index" REAL,
    "timestamp" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "sensor_data_timestamp_idx" ON "sensor_data"("timestamp");
