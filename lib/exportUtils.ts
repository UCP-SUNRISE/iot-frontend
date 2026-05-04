import * as XLSX from "xlsx";

/**
 * Generates a multi-sheet Excel workbook from session telemetry and triggers a download.
 */
export function exportSessionToExcel(sessionDetails: any, sessionId: string) {
  if (!sessionDetails?.telemetry) {
    console.error("Export failed: No telemetry data found in sessionDetails.");
    return;
  }

  const { telemetry, metadata } = sessionDetails;

  // 0. Metadata: Summary of the session parameters
  const metadataArray = Object.entries(metadata || {}).map(([key, value]) => ({
    Property: key,
    Value: value?.toString() ?? "N/A"
  }));

  // 1. Core Telemetry: Flat view of main sensors
  const coreData = telemetry.map((t: any) => ({
    Timestamp: new Date(t.timestamp).toLocaleString(),
    Device_ID: t.device_id,
    Water_Temp: t.water_temperature,
    Food_Temp: t.food_temperature,
  }));

  // 2. Thermal Matrix: Flattened spatial nodes for Temp and Humidity
  const thermalData = telemetry.map((t: any) => {
    const row: any = { Timestamp: new Date(t.timestamp).toLocaleString() };
    if (Array.isArray(t.cube_th)) {
      t.cube_th.forEach((node: any) => {
        const coord = `${node.x},${node.y},${node.z}`;
        row[`Temp(${coord})`] = node.t;
        row[`Hum(${coord})`] = node.h;
      });
    }
    return row;
  });

  // 3. Light Matrix: Flattened spatial nodes for Lux
  const lightData = telemetry.map((t: any) => {
    const row: any = { Timestamp: new Date(t.timestamp).toLocaleString() };
    if (Array.isArray(t.cube_light)) {
      t.cube_light.forEach((node: any) => {
        const coord = `${node.x},${node.y},${node.z}`;
        row[`Lux(${coord})`] = node.lux;
      });
    }
    return row;
  });

  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();
  
  const wsMetadata = XLSX.utils.json_to_sheet(metadataArray);
  wsMetadata["!cols"] = [{ wch: 20 }, { wch: 40 }]; // Set column widths

  const wsCore = XLSX.utils.json_to_sheet(coreData);
  const wsThermal = XLSX.utils.json_to_sheet(thermalData);
  const wsLight = XLSX.utils.json_to_sheet(lightData);

  // Add sheets to workbook (Metadata first)
  XLSX.utils.book_append_sheet(wb, wsMetadata, "Metadata");
  XLSX.utils.book_append_sheet(wb, wsCore, "Core Telemetry");
  XLSX.utils.book_append_sheet(wb, wsThermal, "Thermal Matrix");
  XLSX.utils.book_append_sheet(wb, wsLight, "Light Matrix");

  // Trigger download
  XLSX.writeFile(wb, `SUNRISE_Export_${sessionId}.xlsx`);
}
