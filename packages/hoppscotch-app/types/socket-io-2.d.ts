// NOTE: This is an implementation just for shutting up
// tsc, this is really annoying (and maybe dangerous)
// We don't have access to the 2.4.0 typings, hence we make do with this,
// Check docs before you correct types again as you need
declare module "socket.io-client-v2" {
  export type Socket = any
}
