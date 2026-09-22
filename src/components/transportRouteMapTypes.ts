import type { TransportRouteStop } from '../lib/transportRoster';

export type MapRoute = {
  id: number;
  name: string;
  bus: string;
  color: string;
  stops: TransportRouteStop[];
};

export type MapUnplottedCamper = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  age: number;
  session: string;
};

export type TransportRouteMapNativeProps = {
  routes: MapRoute[];
  allRoutes?: MapRoute[];
  unplottedCampers?: MapUnplottedCamper[];
  campAddress?: string;
  onMoveStop?: (fromRouteId: number, stopIndex: number, toRouteId: number) => void;
  onRemoveStop?: (routeId: number, stopIndex: number) => void;
  onAssignCamper?: (camperId: number, routeId: number) => void;
  onStopPress?: (routeId: number, stopIndex: number, stop: TransportRouteStop) => void;
  onUnplottedPress?: (camperId: number) => void;
};
