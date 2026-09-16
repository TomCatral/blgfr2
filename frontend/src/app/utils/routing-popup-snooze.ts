export const ROUTING_POPUP_SNOOZE_MS = 24 * 60 * 60 * 1000;

export const routingPopupSnoozeKey = (userId: string, routeId: string) =>
  `blgf_routing_popup_snooze:${encodeURIComponent(userId)}:${encodeURIComponent(routeId)}`;

export function isRoutingPopupSnoozed(closedAt: number | null | undefined, now = Date.now()): boolean {
  return typeof closedAt === 'number' && Number.isFinite(closedAt) &&
    closedAt > 0 && now < closedAt + ROUTING_POPUP_SNOOZE_MS;
}
