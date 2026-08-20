const logger = console;
/**
 * @module
 * FilePath utility.
 */

type FilePathOptions = {
  filename: string
  root?: string
  defaultDocument?: string
}

export const getFilePath = (options: FilePathOptions): string | undefined => {
logger.debug(`>>> Entering getFilePath(options=${options})`);
  let filename = options.filename
  const defaultDocument = options.defaultDocument || 'index.html'
logger.debug(`getFilePath(options=${options}): defaultDocument → ${defaultDocument}`);

  if (filename.endsWith('/')) {
    // /top/ => /top/index.html
    filename = filename.concat(defaultDocument)
  } else if (!filename.match(/\.[a-zA-Z0-9_-]+$/)) {
    // /top => /top/index.html
    filename = filename.concat('/' + defaultDocument)
  }

  const path = getFilePathWithoutDefaultDocument({
    root: options.root,
    filename,
  })

logger.debug(`<<< Exiting getFilePath(options=${options})`);
  return path
}

export const getFilePathWithoutDefaultDocument = (
  options: Omit<FilePathOptions, 'defaultDocument'>
): string | undefined => {
logger.debug(`>>> Entering getFilePathWithoutDefaultDocument(options=${options})`);
  let root = options.root || ''
  let filename = options.filename
logger.warn(`getFilePathWithoutDefaultDocument(options=${options}): root → ${root}`);

  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return
  }

  // /foo.html => foo.html
  filename = filename.replace(/^\.?[\/\\]/, '')

  // foo\bar.txt => foo/bar.txt
  filename = filename.replace(/\\/g, '/')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root ? root + '/' + filename : filename
  path = path.replace(/^\.?\//, '')
logger.debug(`getFilePathWithoutDefaultDocument(options=${options}): path → ${path}`);

  if (root[0] !== '/' && path[0] === '/') {
    return
  }

logger.debug(`<<< Exiting getFilePathWithoutDefaultDocument(options=${options})`);
  return path
}
