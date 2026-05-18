/**
 * Default render for the `modal` parallel slot.
 *
 * On hard navigation / page refresh, Next can't infer which intercepted
 * route is active, so it falls back to this default. We render nothing —
 * the actual /profile/[id] page handles the URL standalone.
 */
export default function ModalDefault() {
  return null;
}
