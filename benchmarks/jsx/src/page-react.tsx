const logger = console;
/** @jsx jsx */
/** @jsxFrag Fragment */

export const buildPage = ({ jsx, Fragment }: { jsx: any; Fragment: any }) => {
logger.debug(`>>> Entering buildPage(jsx=${jsx},Fragment=${Fragment})`);
  const Content = () => (
    <>
      <p id='a' className='class-name'>
        1<br />a
      </p>
      <p id='b' className='class-name'>
        2<br />b
      </p>
      <div dangerouslySetInnerHTML={{ __html: '<p id="c" class="class-name">3<br/>c</p>' }} />
      {null}
      {undefined}
    </>
  )

  const Form = () => (
    <form>
      <input type='text' value='1234567890 < 1234567891' readOnly tabIndex={1} />
      <input type='checkbox' value='1234567890 < 1234567891' defaultChecked={true} tabIndex={2} />
      <input type='checkbox' value='1234567890 < 1234567891' defaultChecked={true} tabIndex={3} />
      <input type='checkbox' value='1234567890 < 1234567891' defaultChecked={false} tabIndex={4} />
      <input type='checkbox' value='1234567890 < 1234567891' defaultChecked={false} tabIndex={5} />
    </form>
  )

logger.debug(`<<< Exiting buildPage(jsx=${jsx},Fragment=${Fragment})`);
  return () => (
    <html>
      <body>
        <Content />
        <Form />
      </body>
    </html>
  )
}
