import {
  getMonogram,
  isValidImageUrl,
  parseAvailability,
  parseAvailabilityString,
  formatAvailabilityForSave,
  formatWebsiteUrl,
  AvailabilityGroup,
} from "@/utils/providerUtils";

describe("getMonogram", () => {
  it("returns initials from two-word name", () => {
    expect(getMonogram("John Doe")).toBe("JD");
  });

  it("returns initials from multi-word name (uses first two)", () => {
    expect(getMonogram("Home Care Agency")).toBe("HC");
  });

  it("returns single letter for single-word name", () => {
    expect(getMonogram("Agency")).toBe("A");
  });

  it("returns ? for empty string", () => {
    expect(getMonogram("")).toBe("?");
  });

  it("handles extra whitespace", () => {
    expect(getMonogram("  John   Doe  ")).toBe("JD");
  });

  it("converts to uppercase", () => {
    expect(getMonogram("jane smith")).toBe("JS");
  });
});

describe("isValidImageUrl", () => {
  it("returns true for valid http URL", () => {
    expect(isValidImageUrl("http://example.com/image.jpg")).toBe(true);
  });

  it("returns true for valid https URL", () => {
    expect(isValidImageUrl("https://example.com/image.png")).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidImageUrl(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidImageUrl(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidImageUrl("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(isValidImageUrl("   ")).toBe(false);
  });

  it("returns false for blob URLs", () => {
    expect(isValidImageUrl("blob:http://localhost/abc123")).toBe(false);
  });
});

describe("parseAvailability", () => {
  describe("empty/invalid input", () => {
    it("returns empty schedule for empty string", () => {
      const result = parseAvailability("");
      expect(result.timeSlots).toHaveLength(0);
      expect(result.schedule.every((d) => !d.active)).toBe(true);
    });

    it("returns empty schedule for whitespace only", () => {
      const result = parseAvailability("   ");
      expect(result.timeSlots).toHaveLength(0);
    });
  });

  describe("weekday keywords", () => {
    it("recognizes 'weekdays' keyword", () => {
      const result = parseAvailability("Weekdays 9am-5pm");
      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[1].active).toBe(true); 
      expect(result.schedule[2].active).toBe(true); 
      expect(result.schedule[3].active).toBe(true); 
      expect(result.schedule[4].active).toBe(true); 
      expect(result.schedule[5].active).toBe(false); 
      expect(result.schedule[6].active).toBe(false); 
    });

    it("recognizes 'mon-fri' keyword", () => {
      const result = parseAvailability("Mon-Fri: 08:00-17:00");
      expect(result.schedule[0].active).toBe(true);
      expect(result.schedule[4].active).toBe(true);
      expect(result.schedule[5].active).toBe(false);
    });

    it("recognizes weekend keywords", () => {
      const result = parseAvailability("Weekends only");
      expect(result.schedule[0].active).toBe(false); 
      expect(result.schedule[5].active).toBe(true); 
      expect(result.schedule[6].active).toBe(true); 
    });
  });

  describe("individual day keywords", () => {
    it("recognizes monday", () => {
      const result = parseAvailability("Monday 9am-5pm");
      expect(result.schedule[0].active).toBe(true);
      expect(result.schedule[1].active).toBe(false);
    });

    it("recognizes multiple specific days", () => {
      const result = parseAvailability("Monday and Wednesday 10am-4pm");
      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[1].active).toBe(false); 
      expect(result.schedule[2].active).toBe(true); 
    });

    it("recognizes abbreviated days", () => {
      const result = parseAvailability("Mon, Wed, Fri");
      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[2].active).toBe(true); 
      expect(result.schedule[4].active).toBe(true); 
    });
  });

  describe("24/7 availability", () => {
    it("recognizes 24/7", () => {
      const result = parseAvailability("24/7");
      expect(result.schedule.every((d) => d.active)).toBe(true);
      expect(result.timeSlots).toContain("24 hours");
    });

    it("recognizes '24 hours'", () => {
      const result = parseAvailability("Available 24 hours");
      expect(result.schedule.every((d) => d.active)).toBe(true);
    });

    it("recognizes 'always'", () => {
      const result = parseAvailability("Always available");
      expect(result.schedule.every((d) => d.active)).toBe(true);
    });
  });

  describe("time slot extraction", () => {
    it("extracts time ranges", () => {
      const result = parseAvailability("Weekdays 9am-5pm");
      expect(result.timeSlots).toContain("9am-5pm");
    });

    it("extracts multiple time ranges", () => {
      const result = parseAvailability("8am-12pm and 1pm-5pm weekdays");
      expect(result.timeSlots).toHaveLength(2);
    });

    it("uses raw availability as fallback for time slot", () => {
      const result = parseAvailability("Call for hours");
      expect(result.timeSlots).toContain("Call for hours");
    });
  });

  describe("default behavior", () => {
    it("defaults to weekdays when no days specified", () => {
      const result = parseAvailability("9am-5pm");
      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[4].active).toBe(true); 
      expect(result.schedule[5].active).toBe(false); 
    });
  });

  describe("schedule structure", () => {
    it("has correct day labels", () => {
      const result = parseAvailability("");
      expect(result.schedule[0].short).toBe("Mon");
      expect(result.schedule[0].full).toBe("Monday");
      expect(result.schedule[6].short).toBe("Sun");
      expect(result.schedule[6].full).toBe("Sunday");
    });

    it("sets hours on active days", () => {
      const result = parseAvailability("Monday 9am-5pm");
      expect(result.schedule[0].hours).toBe("9am-5pm");
    });
  });

  describe("default placeholder", () => {
    it("treats 'Mon-Fri' as empty (default placeholder)", () => {
      const result = parseAvailability("Mon-Fri");
      expect(result.schedule.every((d) => !d.active)).toBe(true);
      expect(result.timeSlots).toHaveLength(0);
    });

    it("treats ' Mon-Fri ' with whitespace as empty", () => {
      const result = parseAvailability(" Mon-Fri ");
      expect(result.schedule.every((d) => !d.active)).toBe(true);
      expect(result.timeSlots).toHaveLength(0);
    });
  });

  describe("structured format (from edit page)", () => {
    it("parses single group with day codes", () => {
      const result = parseAvailability("MTWRF: 09:00-17:00");
      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[0].hours).toBe("09:00-17:00");
      expect(result.schedule[4].active).toBe(true); 
      expect(result.schedule[5].active).toBe(false); 
      expect(result.schedule[6].active).toBe(false); 
    });

    it("parses multiple groups with different times", () => {
      const result = parseAvailability("MTWRF: 24 hours; SU: 09:00-17:00");

      expect(result.schedule[0].active).toBe(true); 
      expect(result.schedule[0].hours).toBe("24 hours");
      expect(result.schedule[0].colorIndex).toBe(0);

      expect(result.schedule[5].active).toBe(true); 
      expect(result.schedule[5].hours).toBe("09:00-17:00");
      expect(result.schedule[5].colorIndex).toBe(1);

      expect(result.schedule[6].active).toBe(true); 
      expect(result.schedule[6].hours).toBe("09:00-17:00");
      expect(result.schedule[6].colorIndex).toBe(1);
    });

    it("assigns different colors to different groups", () => {
      const result = parseAvailability(
        "MWF: 08:00-12:00; TR: 13:00-17:00; SU: 10:00-14:00"
      );

      expect(result.schedule[0].colorIndex).toBe(0); 
      expect(result.schedule[2].colorIndex).toBe(0); 
      expect(result.schedule[4].colorIndex).toBe(0); 
      expect(result.schedule[1].colorIndex).toBe(1); 
      expect(result.schedule[3].colorIndex).toBe(1); 
      expect(result.schedule[5].colorIndex).toBe(2); 
      expect(result.schedule[6].colorIndex).toBe(2); 
    });

    it("handles all days 24 hours in structured format", () => {
      const result = parseAvailability("MTWRFSU: 24 hours");
      expect(result.schedule.every((d) => d.active)).toBe(true);
      expect(result.schedule[0].hours).toBe("24 hours");
    });

    it("collects unique time slots from all groups", () => {
      const result = parseAvailability("MTWRF: 24 hours; SU: 09:00-17:00");
      expect(result.timeSlots).toHaveLength(2);
      expect(result.timeSlots).toContain("24 hours");
      expect(result.timeSlots).toContain("09:00-17:00");
    });
  });
});

describe("parseAvailabilityString", () => {
  it("parses single group", () => {
    const result = parseAvailabilityString("MTW: 09:00-17:00");
    expect(result).toHaveLength(1);
    expect(result[0].days).toEqual(["M", "T", "W"]);
    expect(result[0].startTime).toBe("09:00");
    expect(result[0].endTime).toBe("17:00");
    expect(result[0].is24Hours).toBe(false);
  });

  it("parses multiple groups", () => {
    const result = parseAvailabilityString("MTW: 09:00-17:00; RF: 08:00-20:00");
    expect(result).toHaveLength(2);
    expect(result[0].days).toEqual(["M", "T", "W"]);
    expect(result[1].days).toEqual(["R", "F"]);
  });

  it("parses 24 hours", () => {
    const result = parseAvailabilityString("MTWRF: 24 hours");
    expect(result).toHaveLength(1);
    expect(result[0].is24Hours).toBe(true);
    expect(result[0].startTime).toBe("00:00");
    expect(result[0].endTime).toBe("23:59");
  });

  it("returns empty array for empty string", () => {
    const result = parseAvailabilityString("");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for invalid format", () => {
    const result = parseAvailabilityString("invalid data");
    expect(result).toHaveLength(0);
  });
});

describe("formatAvailabilityForSave", () => {
  it("formats single group", () => {
    const groups: AvailabilityGroup[] = [
      {
        id: "1",
        days: ["M", "T", "W"],
        startTime: "09:00",
        endTime: "17:00",
        is24Hours: false,
      },
    ];
    expect(formatAvailabilityForSave(groups)).toBe("MTW: 09:00-17:00");
  });

  it("formats multiple groups", () => {
    const groups: AvailabilityGroup[] = [
      {
        id: "1",
        days: ["M", "T", "W"],
        startTime: "09:00",
        endTime: "17:00",
        is24Hours: false,
      },
      {
        id: "2",
        days: ["R", "F"],
        startTime: "08:00",
        endTime: "20:00",
        is24Hours: false,
      },
    ];
    expect(formatAvailabilityForSave(groups)).toBe(
      "MTW: 09:00-17:00; RF: 08:00-20:00"
    );
  });

  it("formats 24 hours", () => {
    const groups: AvailabilityGroup[] = [
      {
        id: "1",
        days: ["M", "T", "W", "R", "F"],
        startTime: "00:00",
        endTime: "23:59",
        is24Hours: true,
      },
    ];
    expect(formatAvailabilityForSave(groups)).toBe("MTWRF: 24 hours");
  });

  it("skips groups with no days selected", () => {
    const groups: AvailabilityGroup[] = [
      {
        id: "1",
        days: [],
        startTime: "09:00",
        endTime: "17:00",
        is24Hours: false,
      },
      {
        id: "2",
        days: ["M", "T"],
        startTime: "08:00",
        endTime: "16:00",
        is24Hours: false,
      },
    ];
    expect(formatAvailabilityForSave(groups)).toBe("MT: 08:00-16:00");
  });

  it("returns empty string for empty array", () => {
    expect(formatAvailabilityForSave([])).toBe("");
  });
});

describe("formatWebsiteUrl", () => {
  it("adds https:// to bare domain", () => {
    expect(formatWebsiteUrl("example.com")).toBe("https://example.com");
  });

  it("adds https:// to www domain", () => {
    expect(formatWebsiteUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("preserves existing https://", () => {
    expect(formatWebsiteUrl("https://example.com")).toBe("https://example.com");
  });

  it("preserves existing http://", () => {
    expect(formatWebsiteUrl("http://example.com")).toBe("http://example.com");
  });

  it("returns undefined for empty string", () => {
    expect(formatWebsiteUrl("")).toBeUndefined();
  });

  it("returns undefined for whitespace only", () => {
    expect(formatWebsiteUrl("   ")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(formatWebsiteUrl(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(formatWebsiteUrl(undefined)).toBeUndefined();
  });

  it("trims whitespace", () => {
    expect(formatWebsiteUrl("  example.com  ")).toBe("https://example.com");
  });
});

