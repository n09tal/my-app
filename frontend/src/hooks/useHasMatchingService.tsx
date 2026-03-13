export function useHasMatchingService(
  services: string[],
  counties: string[] | null,
  county_service_map: string,
): boolean {
  const countyServicesDict: Record<string, string[]> = {};

  if (county_service_map) {
    county_service_map.split(";").forEach((entry) => {
      const [countyRaw, servicesRaw] = entry.split(":");

      if (countyRaw && servicesRaw) {
        const countyName = countyRaw.trim();
        const serviceList = servicesRaw.split(",").map((s) => s.trim());
        countyServicesDict[countyName] = serviceList;
      }
    });
  }

  if (counties && counties.length > 0) {
    return services.some((service) =>
      counties.some((county) => countyServicesDict[county]?.includes(service)),
    );
  }
  return services.some((service) =>
    Object.keys(countyServicesDict).some((county) =>
      countyServicesDict[county]?.includes(service),
    ),
  );
}
