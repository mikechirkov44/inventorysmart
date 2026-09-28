import { demoMonitoringSource } from './demoSource';

// Transport-independent boundary. Components consume normalized days/snapshots,
// never MTConnect XML, device protocols, or HTTP response structures.
export const monitoringSource = demoMonitoringSource;
