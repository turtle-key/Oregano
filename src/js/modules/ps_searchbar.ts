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

  const cancelBtn = searchCanvas?.querySelector<HTMLElement>('[data-bs-dismiss="offcanvas"]') || null;

  const hideDropdown = (): void => {
    if (!searchDropdown || !searchResults) return;
    searchResults.innerHTML = '';
    searchDropdown.classList.add('d-none');
  };

  searchWidget?.addEventListener('click', () => {
    searchInput?.focus();
  });

  searchIcon?.addEventListener('click', () => {
    if (searchInput?.value) {
      searchInput.form?.submit();
    }
  });

  (searchCanvas as any)?.addEventListener('shown.bs.offcanvas', () => {
    document.body.classList.add('is-search-open');
  });

  // Only the cancel button hides the backdrop
  cancelBtn?.addEventListener('click', () => {
    document.body.classList.remove('is-search-open');
    hideDropdown();
  });

  let outsideClickBound = false;
  const bindOutsideClick = (): void => {
    if (outsideClickBound) return;
    outsideClickBound = true;
    window.addEventListener('click', (e: Event) => {
      const t = e.target as Node | null;
      if (t && searchWidget && !searchWidget.contains(t)) {
        hideDropdown(); // do not touch backdrop here
      }
    });
  };

  let debounceId: number | undefined;
  let lastRequestId = 0;

  const getPriceText = (p: Result): string => {
    const anyP = p as any;
    return (
      anyP?.price?.amount_formatted ||
      anyP?.price?.amount_with_tax_formatted ||
      anyP?.price?.formatted ||
      anyP?.prices?.price ||
      anyP?.price ||
      ''
    ) as string;
  };

  const getImageUrl = (p: Result): string => {
    const anyP = p as any;
    return (
      anyP?.cover?.small?.url ||
      anyP?.cover?.bySize?.small_default?.url ||
      '/img/p/en-default-medium_default.jpg'
    ) as string;
  };

  const buildResultItem = (p: Result): Node => {
    if (searchTemplate?.content) {
      const frag = searchTemplate.content.cloneNode(true) as DocumentFragment;

      const root = frag.querySelector<HTMLLIElement>('.search-result') ?? document.createElement('li');
      const link = frag.querySelector<HTMLAnchorElement>('a') ?? document.createElement('a');
      const img = frag.querySelector<HTMLImageElement>('img') ?? document.createElement('img');
      const name = frag.querySelector<HTMLParagraphElement>('p.search-result__name') ?? document.createElement('p');
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
          (root.querySelector('.search-result__link') as HTMLElement | null)?.append(price) || link.append(price);
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
      bindOutsideClick();
    } else {
      hideDropdown(); // do not remove backdrop here
    }
  };

  if (searchWidget && searchInput && searchResults && searchDropdown) {
    // Do NOT hide backdrop on focus/empty; only hide dropdown when empty
    searchInput.addEventListener('search', (() => {
      if (!searchInput?.value || !searchInput.value.trim()) hideDropdown();
    }) as EventListener);

    // Esc only hides dropdown, backdrop remains until cancel is pressed
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideDropdown();
    });

    searchInput.addEventListener('input', () => {
      if (!searchUrl) return;

      const q = searchInput.value || '';
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
          if (requestId !== lastRequestId) return;
          renderResults(Array.isArray(products) ? products : []);
        } catch {
          if (requestId === lastRequestId) {
            renderResults([]);
          }
        }
      }, 180);
    });
  }
};

export default initSearchbar;