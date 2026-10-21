import { StatCard } from "@/components/lots/StatCard";
import { formatMetric, pctDelta, type OverviewRow } from "@/lib/metrics";
import {
  OVERVIEW_SLOTS,
  isOverviewSlot,
  sumOverviewSlot,
  useOverviewSlot,
  type OverviewSlotKey,
} from "@/lib/overview-slots";

export function OverviewSlotCard({
  current,
  previous,
  scope,
  fallback,
}: {
  current: OverviewRow[];
  previous: OverviewRow[];
  scope: string;
  fallback?: OverviewSlotKey;
}) {
  const { slot, setSlot } = useOverviewSlot(scope, fallback);
  const currentValue = sumOverviewSlot(current, slot.key);
  const previousValue = sumOverviewSlot(previous, slot.key);

  return (
    <StatCard
      label={slot.label}
      value={formatMetric("sessions", currentValue)}
      icon={slot.icon}
      delta={pctDelta(currentValue, previousValue)}
      description={slot.description}
      optionsLabel="Trocar métrica"
      selectedKey={slot.key}
      onSelect={(key) => {
        if (!isOverviewSlot(key)) return;
        setSlot(key);
      }}
      options={OVERVIEW_SLOTS.map((item) => ({
        key: item.key,
        label: item.label,
        description: item.description,
        value: formatMetric("sessions", sumOverviewSlot(current, item.key)),
      }))}
    />
  );
}
