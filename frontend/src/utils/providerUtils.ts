export function getMonogram(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}


export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || url.trim() === "") return false;
  if (url.startsWith("blob:")) return false;
  return true;
}

export interface DaySchedule {
  short: string;
  full: string;
  active: boolean;
  hours: string;
  colorIndex: number;
}


export interface ParsedAvailability {
  schedule: DaySchedule[];
  timeSlots: string[];
}


export function parseAvailability(availability: string): ParsedAvailability {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fullDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];


  const dayCodeToIndex: Record<string, number> = {
    M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6,
  };

  const schedule: DaySchedule[] = days.map((day, idx) => ({
    short: day,
    full: fullDays[idx],
    active: false,
    hours: "",
    colorIndex: 0,
  }));


  if (!availability || availability.trim() === "" || availability.trim() === "Mon-Fri") {
    return { schedule, timeSlots: [] };
  }

  const timeSlots: string[] = [];


  const structuredPattern = /^[MTWRFSU]+\s*:/;
  if (structuredPattern.test(availability.trim())) {
    const groups = availability.split(";").map((s) => s.trim()).filter(Boolean);

    groups.forEach((group, groupIdx) => {
      const colonIndex = group.indexOf(":");
      if (colonIndex === -1) return;

      const daysStr = group.substring(0, colonIndex).trim().toUpperCase();
      const timeStr = group.substring(colonIndex + 1).trim();

      if (timeStr && !timeSlots.includes(timeStr)) {
        timeSlots.push(timeStr);
      }

      for (const char of daysStr) {
        const dayIdx = dayCodeToIndex[char];
        if (dayIdx !== undefined) {
          schedule[dayIdx].active = true;
          schedule[dayIdx].hours = timeStr;
          schedule[dayIdx].colorIndex = Math.min(groupIdx, 2); 
        }
      }
    });

    return { schedule, timeSlots };
  }


  const lower = availability.toLowerCase().trim();


  const timePattern =
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  const matches = availability.match(timePattern);

  if (matches) {
    matches.forEach((match) => {
      if (!timeSlots.includes(match)) {
        timeSlots.push(match);
      }
    });
  }

  const dayKeywords: Record<string, number[]> = {
    weekdays: [0, 1, 2, 3, 4],
    weekday: [0, 1, 2, 3, 4],
    "mon-fri": [0, 1, 2, 3, 4],
    "m-f": [0, 1, 2, 3, 4],
    weekend: [5, 6],
    weekends: [5, 6],
    "sat-sun": [5, 6],
    monday: [0],
    tuesday: [1],
    wednesday: [2],
    thursday: [3],
    friday: [4],
    saturday: [5],
    sunday: [6],
    mon: [0],
    tue: [1],
    wed: [2],
    thu: [3],
    fri: [4],
    sat: [5],
    sun: [6],
  };

  const activeDays = new Set<number>();


  Object.entries(dayKeywords).forEach(([keyword, indices]) => {
    if (lower.includes(keyword)) {
      indices.forEach((i) => activeDays.add(i));
    }
  });


  if (activeDays.size === 0 && availability.trim()) {
    if (
      lower.includes("24/7") ||
      lower.includes("24 hours") ||
      lower.includes("always")
    ) {
      [0, 1, 2, 3, 4, 5, 6].forEach((i) => activeDays.add(i));
      if (timeSlots.length === 0) timeSlots.push("24 hours");
    } else {
      [0, 1, 2, 3, 4].forEach((i) => activeDays.add(i));
    }
  }


  if (timeSlots.length === 0 && availability.trim()) {
    timeSlots.push(availability.trim());
  }

  const colorIndex = Math.min(timeSlots.length - 1, 2);

  activeDays.forEach((dayIdx) => {
    schedule[dayIdx].active = true;
    schedule[dayIdx].hours = timeSlots.join(", ");
    schedule[dayIdx].colorIndex = colorIndex >= 0 ? colorIndex : 0;
  });

  return { schedule, timeSlots };
}

export interface AvailabilityGroup {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
  is24Hours: boolean;
}

export function parseAvailabilityString(availStr: string): AvailabilityGroup[] {
  try {
    const groups: AvailabilityGroup[] = [];
    const parts = availStr
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    parts.forEach((part, index) => {
      const colonIndex = part.indexOf(":");
      if (colonIndex === -1) return;

      const daysStr = part.substring(0, colonIndex).trim();
      const timeStr = part.substring(colonIndex + 1).trim();

      if (daysStr && timeStr) {
        const days = daysStr.split("");
        const is24Hours = timeStr.toLowerCase().includes("24");

        let startTime = "09:00";
        let endTime = "17:00";

        if (!is24Hours && timeStr.includes("-")) {
          const [start, end] = timeStr.split("-").map((s) => s.trim());
          startTime = start;
          endTime = end;
        }

        groups.push({
          id: Date.now().toString() + index,
          days,
          startTime: is24Hours ? "00:00" : startTime,
          endTime: is24Hours ? "23:59" : endTime,
          is24Hours,
        });
      }
    });

    return groups;
  } catch {
    return [];
  }
}

export function formatAvailabilityForSave(
  groups: AvailabilityGroup[]
): string {
  return groups
    .filter((g) => g.days.length > 0)
    .map((group) => {
      const dayStr = group.days.join("");
      if (group.is24Hours) {
        return `${dayStr}: 24 hours`;
      }
      return `${dayStr}: ${group.startTime}-${group.endTime}`;
    })
    .join("; ");
}

export function formatWebsiteUrl(
  website: string | undefined | null
): string | undefined {
  if (!website || !website.trim()) {
    return undefined;
  }

  const trimmed = website.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

