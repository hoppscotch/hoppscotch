interface Object {
  hasOwnProperty<K extends PropertyKey>(key: K): this is Record<K, unknown>;
}
