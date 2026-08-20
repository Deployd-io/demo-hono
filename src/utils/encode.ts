const logger = console;
/**
 * @module
 * Encode utility.
 */

export const decodeBase64Url = (str: string): Uint8Array<ArrayBuffer> => {
logger.debug(`>>> Entering decodeBase64Url(str=${str})`);
logger.debug(`<<< Exiting decodeBase64Url(str=${str})`);
  return decodeBase64(str.replace(/_|-/g, (m) => ({ _: '/', '-': '+' })[m] ?? m))
}

export const encodeBase64Url = (buf: ArrayBufferLike): string =>
  encodeBase64(buf).replace(/\/|\+/g, (m) => ({ '/': '_', '+': '-' })[m] ?? m)

// This approach is written in MDN.
// btoa does not support utf-8 characters. So we need a little bit hack.
export const encodeBase64 = (buf: ArrayBufferLike): string => {
logger.debug(`>>> Entering encodeBase64(buf=${buf})`);
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0, len = bytes.length; i < len; i++) {
logger.debug(`encodeBase64(buf=${buf}): binary → ${binary}`);
    binary += String.fromCharCode(bytes[i])
  }
logger.debug(`encodeBase64(buf=${buf}): bytes → ${bytes}`);
logger.debug(`<<< Exiting encodeBase64(buf=${buf})`);
  return btoa(binary)
}

// atob does not support utf-8 characters. So we need a little bit hack.
export const decodeBase64 = (str: string): Uint8Array<ArrayBuffer> => {
logger.debug(`>>> Entering decodeBase64(str=${str})`);
  const binary = atob(str)
  const bytes = new Uint8Array<ArrayBuffer>(new ArrayBuffer(binary.length))
  const half = binary.length / 2
logger.debug(`decodeBase64(str=${str}): binary → ${binary}`);
logger.debug(`decodeBase64(str=${str}): bytes → ${bytes}`);
  for (let i = 0, j = binary.length - 1; i <= half; i++, j--) {
    bytes[i] = binary.charCodeAt(i)
    bytes[j] = binary.charCodeAt(j)
  }
  return bytes
}
