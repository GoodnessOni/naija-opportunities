const DEFAULT_ZONE = "Africa/Lagos";

export function resolveDateOnlyDeadline(date: string, statedTimezone: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError("Expected YYYY-MM-DD");
  const local = `${date}T23:59:59`;
  const target = Date.parse(`${local}Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== date) {
    throw new RangeError("Invalid calendar date");
  }

  const resolvedTimezone = statedTimezone ?? DEFAULT_ZONE;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: resolvedTimezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });

  function wallTime(epoch: number) {
    const parts = Object.fromEntries(formatter.formatToParts(epoch).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  }

  const candidates = new Set<number>();
  for (const sample of [target - 86400000, target, target + 86400000]) {
    const offset = Date.parse(`${wallTime(sample)}Z`) - sample;
    const candidate = target - offset;
    if (wallTime(candidate) === local) candidates.add(candidate);
  }
  if (candidates.size !== 1) throw new RangeError("Deadline requires timezone review");

  return {
    kind: "fixed" as const,
    fixed_at: new Date([...candidates][0]).toISOString().replace(".000Z", "Z"),
    stated_timezone: statedTimezone,
    resolved_timezone: resolvedTimezone,
    boundary: "inclusive_end_of_local_day" as const,
  };
}
