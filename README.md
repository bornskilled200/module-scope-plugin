# Example of usage

## Folders
app can only import from liba

lib can only import from other libs

external cannot import anything else
```
app
lib
 - liba
 - libc
 - libd
external
 - externala
 - externalb
```

```typescript
import path from 'path';
import ModuleScopePlugin from 'modules-scope-plugin';
import { readdirSync } from "fs";

const getFolders = (...paths: string[]): string[] => {
    return readdirSync(path.resolve(...paths), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(...paths, d.name));
};

export default {
    ...,
    resolve: {
        plugins: [
            new ModuleScopePlugin({
                app: ['lib/liba'],
                lib: [],
                ...getFolders('external').reduce((map, external) => Object.assign(map, { [external]: [] }), {}),
            })
        ],
    },
};
```