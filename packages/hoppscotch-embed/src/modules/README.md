## Modules

A custom user module system. Place a `.ts` file with the following template, it will be installed automatically.

```ts
import { UserModule } from '~/types'

export const install: UserModule = ({ app, router, isClient }) => {
  // do something
}
```
