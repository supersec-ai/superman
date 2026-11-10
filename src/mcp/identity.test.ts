import type { FastifyRequest } from 'fastify';
import { identifyMcpClient } from './identity';
import type { JsonRpcBody } from './types';

const makeReq = (headers: Record<string, unknown>, ip = '203.0.113.9'): FastifyRequest =>
  ({ headers, ip, socket: { remoteAddress: ip } } as unknown as FastifyRequest);

describe('identifyMcpClient', () => {
  it('should sanitize control characters in the User-Agent', () => {
    // Arrange
    const req = makeReq({ 'user-agent': 'client/1.0\nSECURITY_EVENT admin_granted' });

    // Act
    const identity = identifyMcpClient(req, undefined);

    // Assert
    expect(identity.userAgent).not.toContain('\n');
    expect(identity.name).toBe('client');
  });

  it('should sanitize clientInfo name and version', () => {
    // Arrange
    const body = {
      method: 'initialize',
      params: { clientInfo: { name: 'evil\x1b[31m\nclient', version: '1.0\r\nforged' } },
    } as unknown as JsonRpcBody;

    // Act
    const identity = identifyMcpClient(makeReq({}), body);

    // Assert
    expect(identity.name).toBe('evil client');
    expect(identity.version).toBe('1.0  forged');
  });

  it('should fall back to "unknown" when no identity is available', () => {
    // Act
    const identity = identifyMcpClient(makeReq({}), undefined);

    // Assert
    expect(identity.name).toBe('unknown');
    expect(identity.userAgent).toBe('unknown');
  });

  it('should keep the resolved IP address', () => {
    // Act
    const identity = identifyMcpClient(makeReq({}, '198.51.100.7'), undefined);

    // Assert
    expect(identity.ip).toBe('198.51.100.7');
  });
});
