/**
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import {searchProduct, Result} from '@services/search';

const initSearchbar = (): void => {
  const {Theme} = window as any;
  const {searchBar: SearchBarMap} = Theme.selectors;

  const searchCanvas = document.querySelector<HTMLElement>(SearchBarMap.searchCanvas);
  const searchWidget = document.querySelector<HTMLElement>(SearchBarMap.searchWidget);
  const searchDropdown = document.querySelector<HTMLElement>(SearchBarMap.searchDropdown);
  const searchResults = document.querySelector<HTMLElement>(SearchBarMap.searchResults);
  const searchTemplate = document.querySelector<HTMLTemplateElement>(SearchBarMap.searchTemplate);
  const searchInput = document.querySelector<HTMLInputElement>(SearchBarMap.searchInput);
  const searchIcon = document.querySelector<HTMLElement>(SearchBarMap.searchIcon);
  const searchUrl = searchWidget?.dataset.searchControllerUrl as string | undefined;

  // Helper to fully hide popup
  const hideDropdown = (): void => {
    if (!searchDropdown || !searchResults) return;
    searchResults.innerHTML = '';
    searchDropdown.classList.add('d-none');
  };

  // Larger click area focuses input
  searchWidget?.addEventListener('click', () => {
    searchInput?.focus();
  });

  // Submit on icon click only if there is input
  searchIcon?.addEventListener('click', () => {
    if (searchInput?.value) {
      searchInput.form?.submit();
    }
  });

  // Reset dropdown when offcanvas hides
  (searchCanvas as any)?.addEventListener('hidden.bs.offcanvas', () => {
    hideDropdown();
  });

  // Close dropdown on outside click (register once)
  let outsideClickBound = false;
  const bindOutsideClick = (): void => {
    if (outsideClickBound) return;
    outsideClickBound = true;
    window.addEventListener('click', (e: Event) => {
      const t = e.target as Node | null;

      if (t && searchWidget && !searchWidget.contains(t)) {
        hideDropdown();
      }
    });
  };

  // Debounce + request guard to avoid race conditions that can break rendering
  let debounceId: number | undefined;
  let lastRequestId = 0;

  const getPriceText = (p: Result): string => {
    const anyP = p as any;

    return (
      anyP?.price?.amount_formatted
      || anyP?.price?.amount_with_tax_formatted
      || anyP?.price?.formatted
      || anyP?.prices?.price
      || anyP?.price
      || ''
    ) as string;
  };

  const getImageUrl = (p: Result): string => {
    const anyP = p as any;

    // Prefer small url; fallback to bySize.small_default if provided by core
    return (
      anyP?.cover?.small?.url
      || anyP?.cover?.bySize?.small_default?.url
      || '/img/p/en-default-medium_default.jpg'
    ) as string;
  };

  const buildResultItem = (p: Result): Node => {
    // Attempt to use template if present, else create manually
    if (searchTemplate?.content) {
      const frag = searchTemplate.content.cloneNode(true) as DocumentFragment;

      const root = frag.querySelector<HTMLLIElement>('.search-result') ?? document.createElement('li');
      const link = frag.querySelector<HTMLAnchorElement>('a') ?? document.createElement('a');
      const img = frag.querySelector<HTMLImageElement>('img') ?? document.createElement('img');
      const name = frag.querySelector<HTMLParagraphElement>('p.search-result__name') ?? document.createElement('p');
      let price = frag.querySelector<HTMLSpanElement>('.search-result__price') || null;

      link.href = p.canonical_url || '#';
      name.textContent = p.name || '';

      // Image (keep your previous default url behavior with safer fallback)
      img.src = getImageUrl(p);
      img.alt = p.name || '';
      img.referrerPolicy = 'no-referrer';

      // Price (optional fields, shown only if available)
      const priceText = getPriceText(p);

      if (!price && priceText) {
        price = document.createElement('span');
        price.className = 'search-result__price';
      }
      if (price) {
        if (priceText) {
          price.textContent = String(priceText);
          (root.querySelector('.search-result__link') as HTMLElement | null)?.append(price) || link.append(price);
        } else {
          price.remove();
        }
      }

      // Ensure classes exist when building manually
      root.classList.add('search-result');
      link.classList.add('search-result__link');
      img.classList.add('search-result__image');
      name.classList.add('search-result__name');

      // Re-append to ensure correct DOM structure if constructed
      if (!frag.querySelector('.search-result')) {
        const li = root;
        li.appendChild(link);
        link.appendChild(img);
        link.appendChild(name);
        return li;
      }

      return frag;
    }

    // Manual fallback if no template in DOM
    const li = document.createElement('li');
    li.className = 'search-result';

    const a = document.createElement('a');
    a.className = 'search-result__link';
    a.href = p.canonical_url || '#';

    const img = document.createElement('img');
    img.className = 'search-result__image';
    img.src = getImageUrl(p);
    img.alt = p.name || '';
    img.referrerPolicy = 'no-referrer';

    const title = document.createElement('p');
    title.className = 'search-result__name';
    title.textContent = p.name || '';

    const priceEl = document.createElement('span');
    priceEl.className = 'search-result__price';
    const priceText = getPriceText(p);

    if (priceText) {
      priceEl.textContent = String(priceText);
    }

    a.appendChild(img);
    a.appendChild(title);
    if (priceText) a.appendChild(priceEl);
    li.appendChild(a);
    return li;
  };

  const renderResults = (products: Result[]): void => {
    if (!searchResults || !searchDropdown) return;

    if (products?.length) {
      searchResults.innerHTML = '';
      const limited = products.slice(0, 4);
      limited.forEach((p: Result) => {
        const item = buildResultItem(p);
        searchResults.append(item);
      });

      searchDropdown.classList.remove('d-none');
      bindOutsideClick();
    } else {
      hideDropdown();
    }
  };

  if (searchWidget && searchInput && searchResults && searchDropdown) {
    // Always hide popup when field is empty
    const hideIfEmpty = (): void => {
      if (!searchInput?.value || !searchInput.value.trim()) {
        hideDropdown();
      }
    };

    // Hide on focus if empty (prevents showing stale results)
    searchInput.addEventListener('focus', hideIfEmpty);

    // Hide on "search" event (triggered by native clear X in some browsers)
    searchInput.addEventListener('search', hideIfEmpty as EventListener);

    // Hide on Escape
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideDropdown();
    });

    // Reactive updates with debounce and request guard
    searchInput.addEventListener('input', () => {
      if (!searchUrl) return;

      const q = searchInput.value || '';

      // Empty query: clear dropdown
      if (!q.trim()) {
        if (debounceId) window.clearTimeout(debounceId);
        renderResults([]);
        return;
      }

      if (debounceId) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(async () => {
        const requestId = ++lastRequestId;
        try {
          const products: Result[] = await searchProduct(searchUrl, q, 4);

          // Ignore stale responses
          if (requestId !== lastRequestId) return;
          renderResults(Array.isArray(products) ? products : []);
        } catch (err) {
          // On any error, hide dropdown rather than breaking UI
          console.warn('Search error:', err);
          if (requestId === lastRequestId) {
            renderResults([]);
          }
        }
      }, 180);
    });
  }
};

export default initSearchbar;
