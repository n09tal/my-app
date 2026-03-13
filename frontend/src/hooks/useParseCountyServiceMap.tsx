import { useMemo } from "react";
import { Chip } from "@mui/material";

export function useParseCountyServiceMap(
  county_service_map: string | undefined,
) {
  return useMemo(() => {
    if (!county_service_map) {
      return null;
    }
    const uniqueServices = new Set<string>();

    county_service_map.split(";").forEach((entry) => {
      const [, servicesRaw] = entry.split(":");

      if (servicesRaw) {
        const serviceList = servicesRaw.split(",").map((s) => s.trim());
        serviceList.forEach((service) => {
          uniqueServices.add(service);
        });
      }
    });

    return Array.from(uniqueServices).map((service) => (
      <Chip
        key={service}
        label={service}
        size="small"
        variant="outlined"
        sx={{ fontSize: "0.75rem" }}
      />
    ));
  }, [county_service_map]);
}
