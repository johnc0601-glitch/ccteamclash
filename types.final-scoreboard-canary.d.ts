/** CI-only shims for Next's generated CSS module typing and an unrelated
 * legacy media dependency. Not included in production tsconfig.json.
 */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module 'heic-convert';
