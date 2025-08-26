import {searchProduct, Result} from '@services/search';

type SearchBarSelectors = {
  searchCanvas: string;
  searchWidget: string;
  searchDropdown: string;
  searchResults: string;
  searchTemplate: string;
  searchInput: string;
  searchIcon: string;
};

type ThemeGlobals = {
  selectors: {
    searchBar: SearchBarSelectors;
  };
};

type WindowWithTheme = Window & { Theme: ThemeGlobals };

const initSearchbar = (): void => {
  const {Theme} = (window as WindowWithTheme);
  const {searchBar: SearchBarMap} = Theme.selectors;

  const searchCanvas = document.querySelector<HTMLElement>(SearchBarMap.searchCanvas);
  const searchWidget = document.querySelector<HTMLElement>(SearchBarMap.searchWidget);
  const searchDropdown = document.querySelector<HTMLElement>(SearchBarMap.searchDropdown);
  const searchResults = document.querySelector<HTMLElement>(SearchBarMap.searchResults);
  const searchTemplate = document.querySelector<HTMLTemplateElement>(SearchBarMap.searchTemplate);
  const searchInput = document.querySelector<HTMLInputElement>(SearchBarMap.searchInput);
  const searchIcon = document.querySelector<HTMLElement>(SearchBarMap.searchIcon);
  const searchUrl = searchWidget?.dataset.searchControllerUrl as string | undefined;

  const cancelBtn = searchCanvas?.querySelector<HTMLElement>('[data-bs-dismiss="offcanvas"]') || null;

  // Header trigger(s) that toggle this offcanvas (icon in the header)
  const headerTriggers = Array.from(
    document.querySelectorAll<HTMLElement>(
      `[data-bs-toggle="offcanvas"][data-bs-target="${SearchBarMap.searchCanvas}"],`
      + `[data-bs-toggle="offcanvas"][href="${SearchBarMap.searchCanvas}"]`,
    ),
  );

  const hideDropdown = (): void => {
    if (!searchDropdown || !searchResults) return;
    searchResults.innerHTML = '';
    searchDropdown.classList.add('d-none');
  };

  const showDropdown = (): void => {
    if (!searchDropdown) return;
    searchDropdown.classList.remove('d-none');
  };

  // Whether the DOM currently shows any product items (keep these while fetching new queries)
  const hasProductItemsInDom = (): boolean => !!searchResults?.querySelector('.search-result__link');

  const showLoading = (): void => {
    if (!searchResults) return;
    // Only show "Searching…" when there are no products currently displayed
    if (hasProductItemsInDom()) return;
    // Simple, lightweight loading state to make the popup appear immediately
    searchResults.innerHTML = `
      <li class="search-result search-result--loading" aria-live="polite">Searching…</li>
    `;
  };

  const removeBackdropAndDropdown = (): void => {
    document.body.classList.remove('is-search-open');
    hideDropdown();
  };

  const focusSearchAtEnd = (): void => {
    if (!searchInput) return;
    const len = (searchInput.value || '').length;
    // Defer to ensure offcanvas is fully painted
    requestAnimationFrame(() => {
      try {
        searchInput.focus({preventScroll: true});
      } catch {
        searchInput.focus();
      }
      try {
        searchInput.setSelectionRange(len, len);
      } catch {
        // Fallback: move cursor by resetting value (avoids selecting text)
        const v = searchInput.value;
        searchInput.value = '';
        searchInput.value = v;
      }
    });
  };

  // Action that mimics pressing the Cancel button (Shop.Theme.Global cancel)
  const closeViaCancelAction = (): void => {
    cancelBtn?.click(); // let Bootstrap handle dismissal the same way as the real cancel
  };

  // Focus input when clicking anywhere in the widget
  searchWidget?.addEventListener('click', () => {
    searchInput?.focus();
  });

  // Submit only if there is input; overlay/backdrop lifecycle handled by offcanvas events
  searchIcon?.addEventListener('click', () => {
    if (searchInput?.value) {
      searchInput.form?.submit();
    }
  });

  // Backdrop lifecycle: add on open
  searchCanvas?.addEventListener('shown.bs.offcanvas', () => {
    document.body.classList.add('is-search-open');
    bindGlobalCloseHandlers();
    focusSearchAtEnd(); // autofocus with caret at the end
  });

  // Always remove custom backdrop when the offcanvas fully hides (no matter how it closes)
  searchCanvas?.addEventListener('hidden.bs.offcanvas', () => {
    unbindGlobalCloseHandlers();
    removeBackdropAndDropdown();
  });

  // Make the header trigger behave like pressing the "Cancel" button when the panel is already open
  headerTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const isOpen = !!searchCanvas?.classList.contains('show');

      if (isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeViaCancelAction();
      }
      // If not open, let Bootstrap open it normally
    });
  });

  // Cancel button: let Bootstrap handle dismissal; cleanup runs on hidden.bs.offcanvas
  cancelBtn?.addEventListener('click', () => {
    // intentionally empty; do not manually touch backdrop here
  });

  // Close the entire overlay on Escape or clicking anywhere outside the offcanvas
  let globalHandlersBound = false;

  const onDocKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && searchCanvas?.classList.contains('show')) {
      // don't block default page behavior beyond closing the overlay
      closeViaCancelAction();
    }
  };

  const onDocClick = (e: MouseEvent) => {
    const t = e.target as Node | null;

    if (!t || !searchCanvas) return;
    if (searchCanvas.classList.contains('show') && !searchCanvas.contains(t)) {
      // Click outside the offcanvas: close it like the Cancel button
      closeViaCancelAction();
      // Do NOT preventDefault; allow normal link clicks to continue
    }
  };

  const bindGlobalCloseHandlers = () => {
    if (globalHandlersBound) return;
    globalHandlersBound = true;
    // Use capture so we can react before other handlers if needed, but still allow navigation
    document.addEventListener('keydown', onDocKeydown, true);
    document.addEventListener('click', onDocClick, true);
  };

  const unbindGlobalCloseHandlers = () => {
    if (!globalHandlersBound) return;
    globalHandlersBound = false;
    document.removeEventListener('keydown', onDocKeydown, true);
    document.removeEventListener('click', onDocClick, true);
  };

  let debounceId: number | undefined;
  let lastRequestId = 0;

  // Cache results by exact query to display something instantly while fetching
  const resultsCache = new Map<string, Result[]>();

  type PriceShape = {
    price?:
      | {
          amount_formatted?: string;
          amount_with_tax_formatted?: string;
          formatted?: string;
        }
      | string
      | number;
    prices?: { price?: string };
  };

  const getPriceText = (p: Result): string => {
    const x = p as PriceShape;

    if (typeof x.price === 'string' || typeof x.price === 'number') {
      return String(x.price);
    }

    const priceObj = x.price && typeof x.price === 'object' ? x.price : undefined;

    return (
      priceObj?.amount_formatted
      || priceObj?.amount_with_tax_formatted
      || priceObj?.formatted
      || x.prices?.price
      || ''
    ) as string;
  };

  type CoverShape = {
    cover?: {
      small?: { url?: string };
      bySize?: { small_default?: { url?: string } };
    };
  };

  const getImageUrl = (p: Result): string => {
    const x = p as CoverShape;

    return (
      x.cover?.small?.url
      || x.cover?.bySize?.small_default?.url
      || '/img/p/en-default-medium_default.jpg'
    ) as string;
  };

  const buildResultItem = (p: Result): Node => {
    if (searchTemplate?.content) {
      const frag = searchTemplate.content.cloneNode(true) as DocumentFragment;

      const root = (frag.querySelector<HTMLLIElement>('.search-result') ?? document.createElement('li'));
      const link = frag.querySelector<HTMLAnchorElement>('a') ?? document.createElement('a');
      const img = frag.querySelector<HTMLImageElement>('img') ?? document.createElement('img');
      const name = (frag.querySelector<HTMLParagraphElement>('p.search-result__name')
          ?? document.createElement('p'));
      let price = frag.querySelector<HTMLSpanElement>('.search-result__price') || null;

      link.href = p.canonical_url || '#';
      name.textContent = p.name || '';

      img.src = getImageUrl(p);
      img.alt = p.name || '';
      img.referrerPolicy = 'no-referrer';

      const priceText = getPriceText(p);

      if (!price && priceText) {
        price = document.createElement('span');
        price.className = 'search-result__price';
      }
      if (price) {
        if (priceText) {
          price.textContent = String(priceText);
          const existingLink = root.querySelector('.search-result__link') as HTMLElement | null;

          if (existingLink) {
            existingLink.append(price);
          } else {
            link.append(price);
          }
        } else {
          price.remove();
        }
      }

      root.classList.add('search-result');
      link.classList.add('search-result__link');
      img.classList.add('search-result__image');
      name.classList.add('search-result__name');

      if (!frag.querySelector('.search-result')) {
        const li = root;
        li.appendChild(link);
        link.appendChild(img);
        link.appendChild(name);
        return li;
      }

      return frag;
    }

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
      // We now close the whole overlay on outside click, so a dedicated dropdown outside click is unnecessary.
      // Keeping the dropdown simple avoids conflicting behaviors.
    } else {
      hideDropdown(); // backdrop remains until offcanvas closes
    }
  };

  const MIN_CHARS = 1;
  const DEBOUNCE_MS = 20; // was ~180ms; reduce to show results sooner

  if (searchWidget && searchInput && searchResults && searchDropdown) {
    // Clear dropdown via native search event
    searchInput.addEventListener('search', () => {
      if (!searchInput?.value || !searchInput.value.trim()) hideDropdown();
    });

    // Only hide dropdown on Escape; full overlay closes via document Escape handler
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideDropdown();
    });

    // Show popup immediately and then fetch with a short debounce
    searchInput.addEventListener('input', () => {
      if (!searchUrl) return;

      const raw = searchInput.value || '';
      const q = raw.trim();

      if (q.length < MIN_CHARS) {
        if (debounceId) window.clearTimeout(debounceId);
        renderResults([]);
        return;
      }

      // Make the dropdown appear right away
      showDropdown();

      // If we have cached results for this exact query, render them instantly
      const cached = resultsCache.get(q);

      if (cached && cached.length) {
        renderResults(cached);
      } else if (searchResults) {
        // Only show a lightweight loading row if there are no existing products visible
        if (!hasProductItemsInDom()) {
          showLoading();
        }
      }

      if (debounceId) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(async () => {
        lastRequestId += 1;
        const requestId = lastRequestId;
        try {
          const products: Result[] = await searchProduct(searchUrl, q, 4);

          if (requestId !== lastRequestId) return;

          const safe = Array.isArray(products) ? products : [];
          resultsCache.set(q, safe);
          if (safe.length) {
            renderResults(safe);
          } else {
            // Keep the dropdown visible but empty state: reuse loading row -> switch to "No results"
            searchResults.innerHTML = `
                <li class="search-result search-result--empty" aria-live="polite">No results</li>
              `;
          }
        } catch {
          if (requestId === lastRequestId) {
            if (searchResults) {
              searchResults.innerHTML = `
                <li class="search-result search-result--error" aria-live="polite">Could not load results</li>
              `;
            }
          }
        }
      }, DEBOUNCE_MS);
    });
  }
};

export default initSearchbar;
