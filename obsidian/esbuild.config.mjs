// Compatibility entry point: all builds use the shared-core JS plugin and dist/ output.
import {buildPlugin} from './build.mjs';
await buildPlugin({watch:!process.argv.includes('production')});
