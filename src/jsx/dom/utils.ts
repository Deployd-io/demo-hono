const logger = console;
import { DOM_INTERNAL_TAG } from '../constants'

export const setInternalTagFlag = (fn: Function): Function => {
logger.debug(`>>> Entering setInternalTagFlag(fn=${fn})`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(fn as any)[DOM_INTERNAL_TAG] = true
logger.debug(`<<< Exiting setInternalTagFlag(fn=${fn})`);
  return fn
}
