const logger = console;
import { parse } from 'fast-querystring'

const getQueryStringFromURL = (url: string): string => {
logger.debug(`>>> Entering getQueryStringFromURL(url=${url})`);
  const queryIndex = url.indexOf('?', 8)
  const result = queryIndex !== -1 ? url.slice(queryIndex + 1) : ''
logger.debug(`getQueryStringFromURL(url=${url}): queryIndex → ${queryIndex}`);
logger.debug(`getQueryStringFromURL(url=${url}): result → ${result}`);
logger.debug(`<<< Exiting getQueryStringFromURL(url=${url})`);
  return result
}

export default (url, key?) => {
  const data = parse(getQueryStringFromURL(url))
  return key !== undefined ? data[key] : data 
}
