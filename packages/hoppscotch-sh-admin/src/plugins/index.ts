import { RegisteredComponentsDef } from '~/helpers/components';

export type PluginsDef = {
  components: RegisteredComponentsDef;
};

export let plugins: PluginsDef;

export function setPluginsDef(def: PluginsDef) {
  plugins = def;
}
