/**
 * Tests for useHasMatchingService hook
 */

import { renderHook } from "@testing-library/react";
import { useHasMatchingService } from "../hooks/useHasMatchingService";

describe("useHasMatchingService", () => {
  it("should return true when service matches county in the map", () => {
    const services = ["Home Care"];
    const counties = ["Los Angeles"];
    const countyServiceMap =
      "Los Angeles: Home Care, Nursing; Orange: Physical Therapy";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return false when service doesn't match county in the map", () => {
    const services = ["Home Care"];
    const counties = ["Orange"];
    const countyServiceMap =
      "Los Angeles: Home Care, Nursing; Orange: Physical Therapy";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(false);
  });

  it("should return true when service with backslash matches county", () => {
    const services = ["Environmental\\Home Mod Install"];
    const counties = ["Lake"];
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return true when one of multiple services matches", () => {
    const services = [
      "Nursing Care",
      "Environment\\Home Mod Maint",
      "Physical Therapy",
    ];
    const counties = ["Porter"];
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return true when no counties provided and service matches", () => {
    const services = ["Environmental\\Home Mod Install"];
    const counties: string[] = [];
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return false when county exists but service doesn't match exactly", () => {
    const services = ["Environmental\\Home Mod"];
    const counties = ["Lake"];
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(false);
  });

  it("should return true when multiple counties provided and service matches one", () => {
    const services = ["Environmental\\Home Mod Install"];
    const counties = ["Lake", "Porter", "LaPorte"];
    const countyServiceMap =
      "Lake: Nursing Care, Physical Therapy; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install; LaPorte: Meal Delivery";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return true when counties is null and service matches any county", () => {
    const services = ["Environmental\\Home Mod Install"];
    const counties = null;
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(true);
  });

  it("should return false when counties doesn't contain the county where the service is in the map", () => {
    const services = ["Environmental\\Home Mod Install"];
    const counties: string[] = ["LaPorte"];
    const countyServiceMap =
      "Lake: Environmental\\Home Mod Install, Environment\\Home Mod Maint; Porter: Environment\\Home Mod Maint, Environmental\\Home Mod Install";

    const { result } = renderHook(() =>
      useHasMatchingService(services, counties, countyServiceMap),
    );

    expect(result.current).toBe(false);
  });
});
