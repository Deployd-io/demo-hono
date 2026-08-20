/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { html, raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer, HtmlEscaped } from '../utils/html'
const logger = console;
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { isValidAttributeName, styleObjectForEach } from './utils'

export { html as jsxTemplate }

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
logger.debug(`>>> Entering jsxAttr(key=${key},v=${v})`);
  if (!isValidAttributeName(key)) {
    return raw('')
  }
  const buffer: StringBuffer = [`${key}="`] as StringBuffer
  if (key === 'style' && typeof v === 'object') {
    // object to style strings
    let styleStr = ''
	logger.debug(`jsxAttr(key=${key},v=${v}): styleStr → ${styleStr}`);
    styleObjectForEach(v as Record<string, string | number>, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ';' : ''}${property}:${value}`
      }
    })
    escapeToBuffer(styleStr, buffer)
    buffer[0] += '"'
  } else if (typeof v === 'string') {
    escapeToBuffer(v, buffer)
    buffer[0] += '"'
  } else if (v === null || v === undefined) {
    return raw('')
  } else if (typeof v === 'number' || (v as unknown as HtmlEscaped).isEscaped) {
    buffer[0] += `${v}"`
  } else if (v instanceof Promise) {
    buffer.unshift('"', v)
  } else {
    escapeToBuffer(v.toString(), buffer)
    buffer[0] += '"'
  }

logger.debug(`<<< Exiting jsxAttr(key=${key},v=${v})`);
  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
