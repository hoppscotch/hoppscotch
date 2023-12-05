/**
 * Defines how a Shortcode is represented in the ShortcodeListAdapter
 */
export interface Shortcode {
  id: string
  request: string
  properties?: string | null
  createdOn: Date
}
