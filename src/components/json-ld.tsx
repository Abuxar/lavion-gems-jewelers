/**
 * Structured data, rendered server-side into the HTML.
 *
 * It goes in as a script tag rather than through next/script because crawlers
 * read the markup they are served; anything injected later may or may not be
 * seen, and the whole point of this data is to be read by a machine that is not
 * necessarily running scripts.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built by us from catalogue fields, never from raw user
      // input, and JSON.stringify escapes the quotes that would otherwise let a
      // product name break out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c')
      }}
    />
  );
}
