import type { NavigationState, PartialState } from '@react-navigation/native';
import type { ActiveRoute } from './campScreenAccess';

export function getActiveRoute(state: NavigationState | PartialState<NavigationState>): ActiveRoute {
  const route = state.routes[state.index ?? 0];
  if (route.state) {
    return getActiveRoute(route.state);
  }
  return { name: route.name, params: route.params as Record<string, unknown> | undefined };
}
