import type { DocumentRouteStep } from '../types';

// Start at handoffs received or sent by the signed-in user, then follow their
// downstream branches. A name is used only for legacy rows that have no ID.
export function getUserRecipientFlow(
  routes: DocumentRouteStep[],
  userId: string,
  userName?: string,
): DocumentRouteStep[] {
  if (!userId) return [];
  const visible = new Set<string>();
  const normalizedUserName = userName?.trim().toLowerCase();
  const isCurrentUser = (id?: string, name?: string) =>
    id === userId ||
    (!id &&
      Boolean(normalizedUserName) &&
      name?.trim().toLowerCase() === normalizedUserName);
  return routes.filter((route, index) => {
    if (!route.toUserId) return false;
    const parent = route.fromUserId
      ? routes.slice(0, index).reverse().find(previous => previous.toUserId === route.fromUserId)
      : undefined;
    const included =
      isCurrentUser(route.toUserId, route.toUser) ||
      isCurrentUser(route.fromUserId, route.fromUser) ||
      Boolean(parent && visible.has(parent.id));
    if (included) visible.add(route.id);
    return included;
  });
}
