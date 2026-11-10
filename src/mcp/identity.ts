import type { FastifyRequest } from 'fastify';

import type { JsonRpcBody, McpClientIdentity } from './types';
import { sanitizeLogValue } from './sanitize';

/**
 * Extracts the best-effort identity of the MCP client that issued the request.
 *
 * Priority for `name` and `version`:
 *   1. `params.clientInfo` (sent on `initialize` by the MCP client) — canonical.
 *   2. First segment of `User-Agent` (e.g. `claude-code/2.1.0` → `claude-code`).
 *   3. The literal string `'unknown'`.
 *
 * In stateless mode (the framework default), `clientInfo` is only present on
 * `initialize` requests; subsequent `tools/call` requests will resolve identity
 * from `User-Agent` alone.
 */
export const identifyMcpClient = (req: FastifyRequest, body: JsonRpcBody | undefined): McpClientIdentity => {
  const userAgent = sanitizeLogValue(req.headers['user-agent']);
  const ip = sanitizeLogValue(req.ip ?? req.socket.remoteAddress);
  const clientInfo = body?.params?.clientInfo;
  const inferredName = sanitizeLogValue(clientInfo?.name ?? userAgent.split('/')[0]);
  const identity: McpClientIdentity = { name: inferredName, userAgent, ip };
  if (clientInfo?.version) identity.version = sanitizeLogValue(clientInfo.version);
  return identity;
};