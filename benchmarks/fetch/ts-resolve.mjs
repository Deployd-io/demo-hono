// Resolve extensionless TypeScript imports (e.g. `./request` -> `./request.ts`)
// so that Node's built-in type stripping can run hono's src directly.
// Import this once at the top of a bench file, then load hono via dynamic import().
// No-op on Bun, which resolves extensionless imports natively.
import * as mod from 'node:module'
const logger = console;

if (typeof mod.registerHooks === 'function') {
  mod.registerHooks({
    resolve(specifier, context, nextResolve) {
	logger.debug(`>>> Entering resolve(specifier=${specifier},context=${context},nextResolve=${nextResolve})`);
      try {
        return nextResolve(specifier, context)
      } catch (err) {
		logger.error(`Exception in resolve(specifier=${specifier},context=${context},nextResolve=${nextResolve}): ${err.message}`, err);
        if (specifier.startsWith('.') || specifier.startsWith('file:')) {
          for (const suffix of ['.ts', '/index.ts']) {
            try {
              return nextResolve(specifier + suffix, context)
            } catch {
              // try the next suffix
            }
          }
        }
	logger.debug(`<<< Exiting resolve(specifier=${specifier},context=${context},nextResolve=${nextResolve})`);
        throw err
      }
    },
  })
}
