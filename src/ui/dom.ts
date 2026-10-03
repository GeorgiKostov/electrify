const rendered = new WeakMap<HTMLElement, string>();
// Unchanged sections keep their exact DOM identity. Changed sections retain open details, scroll and input focus.
export function patch(host: HTMLElement, html: string) {
  if (rendered.get(host) === html) return false;
  rendered.set(host, html);
  const scrollTop = host.scrollTop,
    scrollLeft = host.scrollLeft,
    details = Array.from(
      host.querySelectorAll<HTMLDetailsElement>('details'),
    ).map((d) => d.open);
  const nestedScroll = new Map(
    Array.from(host.querySelectorAll<HTMLElement>('[data-scroll-key]')).map(
      (element) => [
        element.dataset.scrollKey!,
        [element.scrollTop, element.scrollLeft],
      ],
    ),
  );
  const focused = document.activeElement as HTMLInputElement | null,
    inside = !!focused && host.contains(focused);
  const key = inside
    ? focused!.id
      ? '#' + focused!.id
      : Object.entries(focused!.dataset)
          .map(
            ([k, v]) =>
              '[data-' +
              k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) +
              '="' +
              v +
              '"]',
          )
          .join('')
    : '';
  const start = inside ? focused!.selectionStart : null,
    end = inside ? focused!.selectionEnd : null;
  host.innerHTML = html;
  Array.from(host.querySelectorAll<HTMLDetailsElement>('details')).forEach(
    (d, i) => (d.open = details[i] ?? false),
  );
  for (const element of Array.from(
    host.querySelectorAll<HTMLElement>('[data-scroll-key]'),
  )) {
    const position = nestedScroll.get(element.dataset.scrollKey!);
    if (position) {
      element.scrollTop = position[0];
      element.scrollLeft = position[1];
    }
  }
  host.scrollTop = scrollTop;
  host.scrollLeft = scrollLeft;
  if (key) {
    const replacement = host.querySelector<HTMLInputElement>(key);
    replacement?.focus({ preventScroll: true });
    if (
      replacement &&
      typeof start === 'number' &&
      typeof end === 'number' &&
      typeof replacement.setSelectionRange === 'function'
    )
      replacement.setSelectionRange(start, end);
  }
  return true;
}
