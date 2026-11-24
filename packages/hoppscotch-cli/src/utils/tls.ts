/**
 * Turns off TLS certificate verification for the rest of the process, letting
 * the CLI talk to servers presenting self-signed, expired or otherwise
 * untrusted certificates.
 *
 * Node.js reads `NODE_TLS_REJECT_UNAUTHORIZED` while establishing every TLS
 * connection, so setting it here covers each network path at once: requests
 * from the collection, the digest auth handshake, `hopp.fetch()` /
 * `pm.sendRequest()` calls from scripts and workspace lookups against a
 * self-hosted instance. A custom `https.Agent` is not an option for the
 * scripting path since `axios-cookiejar-support` rejects foreign agents.
 */
export const disableTLSCertificateVerification = () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
};
