/**
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import { searchProduct, Result } from '@services/search';

const initSearchbar = () => {
  const { Theme } = window as any;
  const { searchBar: SearchBarMap } = Theme.selectors;

  const searchCanvas = document.querySelector<HTMLElement>(SearchBarMap.searchCanvas);
  const searchWidget = document.querySelector<HTMLElement>(SearchBarMap.searchWidget);
  const searchDropdown = document.querySelector<HTMLElement>(SearchBarMap.searchDropdown);
  const searchResults = document.querySelector<HTMLElement>(SearchBarMap.searchResults);
  const searchTemplate = document.querySelector<HTMLTemplateElement>(SearchBarMap.searchTemplate);
  const searchInput = document.querySelector<HTMLInputElement>(SearchBarMap.searchInput);
  const searchIcon = document.querySelector<HTMLElement>(SearchBarMap.searchIcon);
  const searchUrl = searchWidget?.dataset.searchControllerUrl as string | undefined;

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
  searchCanvas?.addEventListener('hidden.bs.offcanvas', () => {
    if (searchDropdown) {
      searchDropdown.innerHTML = '';
      searchDropdown.classList.add('d-none');
    }
  });

  // Close dropdown on outside click (register once)
  let outsideClickBound = false;
  const bindOutsideClick = () => {
    if (outsideClickBound) return;
    outsideClickBound = true;
    window.addEventListener('click', (e: Event) => {
      const t = e.target as Node;
      if (searchWidget && !searchWidget.contains(t)) {
        searchDropdown?.classList.add('d-none');
      }
    });
  };

  const buildResultItem = (p: Result): Node => {
    // Attempt to use template if present, else create manually
    if (searchTemplate?.content) {
      const frag = searchTemplate.content.cloneNode(true) as DocumentFragment;

      const root = frag.querySelector<HTMLLIElement>('.search-result') ?? document.createElement('li');
      const link = frag.querySelector<HTMLAnchorElement>('a') ?? document.createElement('a');
      const img = frag.querySelector<HTMLImageElement>('img') ?? document.createElement('img');
      const name = frag.querySelector<HTMLParagraphElement>('p.search-result__name') ?? document.createElement('p');

      // Optional placeholders (if you extend your template)
      let price = frag.querySelector<HTMLSpanElement>('.search-result__price') || null;

      link.href = p.canonical_url || '#';
      name.textContent = p.name || '';

      // Image
      img.src = '/img/p/en-default-medium_default.jpg';
      img.alt = p.name;
      if (p?.cover?.small?.url) {
        img.src = p.cover.small.url;
      } 
      // Price (optional fields, shown only if available)
      const priceText =
        (p as any)?.price?.amount_formatted ||
        (p as any)?.price?.amount_with_tax_formatted ||
        (p as any)?.price?.formatted ||
        (p as any)?.prices?.price ||
        (p as any)?.price ||
        '';

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
    img.src = '/img/p/en-default-medium_default.jpg';
    img.alt = p.name || '';
    if (p?.cover?.small?.url) {
      img.src = p.cover.small.url;
    }

    const title = document.createElement('p');
    title.className = 'search-result__name';
    title.textContent = p.name || '';

    const priceEl = document.createElement('span');
    priceEl.className = 'search-result__price';
    const priceText =
      (p as any)?.price?.amount_formatted ||
      (p as any)?.price?.amount_with_tax_formatted ||
      (p as any)?.price?.formatted ||
      (p as any)?.prices?.price ||
      (p as any)?.price ||
      '';
    if (priceText) {
      priceEl.textContent = String(priceText);
    }

    a.appendChild(img);
    a.appendChild(title);
    if (priceText) a.appendChild(priceEl);
    li.appendChild(a);
    return li;
  };

  if (searchWidget && searchInput && searchResults && searchDropdown) {
    // Use 'input' for reactive updates
    searchInput.addEventListener('input', async () => {
      if (!searchUrl) return;

      const q = searchInput.value || '';
      // Empty query: clear dropdown
      if (!q.trim()) {
        searchResults.innerHTML = '';
        searchDropdown.classList.add('d-none');
        return;
      }

      const products: Result[] = await searchProduct(searchUrl, q, 10);

      if (products && products.length > 0) {
        searchResults.innerHTML = '';
        products.forEach((p: Result) => {
          const item = buildResultItem(p);
          searchResults.append(item);
        });

        searchDropdown.classList.remove('d-none');
        bindOutsideClick();
      } else {
        searchResults.innerHTML = '';
        searchDropdown.classList.add('d-none');
      }
    });
  }
};

export default initSearchbar;