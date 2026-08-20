import type { Props } from '../base'
const logger = console;

export const deDupeKeyMap: Record<string, string[]> = {
  title: [],
  script: ['src'],
  style: ['data-href'],
  link: ['href'],
  meta: ['name', 'httpEquiv', 'charset', 'itemProp'],
}

export const domRenderers: Record<string, Function> = {}

export const dataPrecedenceAttr = 'data-precedence'

export const isStylesheetLinkWithPrecedence = (props: Props): boolean =>
  props.rel === 'stylesheet' && 'precedence' in props

export const shouldDeDupeByKey = (tagName: string, supportSort: boolean): boolean => {
logger.debug(`>>> Entering shouldDeDupeByKey(tagName=${tagName},supportSort=${supportSort})`);
  if (tagName === 'link') {
    return supportSort
  }
logger.debug(`<<< Exiting shouldDeDupeByKey(tagName=${tagName},supportSort=${supportSort})`);
  return deDupeKeyMap[tagName].length > 0
}
