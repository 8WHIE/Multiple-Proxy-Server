export type ProxyType = 'http' | 'socks5';

export type ProxyStatus = 'running' | 'stopped' | 'error' | 'port_conflict';

export interface DiscoveredIPv6 {
  interface: string;
  address: string;
  prefixLen: number;
  scope: 'global' | 'link' | 'host' | 'multicast';
  isGlobal: boolean;
  inUseBy?: string;
  details: string;
}

export interface ManagedProxy {
  id: string;
  type: ProxyType;
  port: number;
  ipv6Address: string;
  username: string;
  password?: string;
  passwordHash: string;
  enabled: boolean;
  status: ProxyStatus;
  maxConnections: number;
  timeoutSeconds: number;
  description: string;
  bytesIn: number;
  bytesOut: number;
  activeConnections: number;
  createdAt: number;
}

export interface TestResult {
  proxyId: string;
  proxyType: ProxyType;
  port: number;
  targetIPv6: string;
  isRunning: boolean;
  portListening: boolean;
  authVerified: boolean;
  outboundBindVerified: boolean;
  latencyMs: number;
  errorMessage?: string;
  timestamp: number;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  proxyId?: string;
  message: string;
}
