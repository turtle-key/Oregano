{**
 * For the full copyright and license information.
 *}
{$headerBottomName = 'header-bottom'}

{block name='header_banner'}
  <div class="header__banner">
    {hook h='displayBanner'}
  </div>
{/block}

{block name='header_bottom'}
  <div class="{$headerBottomName}">
    <div class="container-md {$headerBottomName}__container">
      <div class="row align-items-center {$headerBottomName}__row">

        <div class="col d-flex justify-content-start align-items-center">
          {hook h='displayTopLeft'}
        </div>

        <div class="col-auto text-center logo">
          {if $shop.logo_details}
            {if $page.page_name == 'index'}<h1 class="{$headerBottomName}__h1 mb-0">{/if}
              {renderLogo}
            {if $page.page_name == 'index'}</h1>{/if}
          {/if}
        </div>

        <div class="col d-flex justify-content-end align-items-center">
          
          <div class="search__all d-flex col-auto">
            <div class="header-block d-flex align-items-center">
              <a class="header-block__action-btn"
                 href="#"
                 role="button"
                 data-bs-toggle="offcanvas"
                 data-bs-target="#searchCanvas"
                 aria-controls="searchCanvas"
                 aria-label="{l s='Show search bar' d='Shop.Theme.Global'}">
                <span class="material-icons header-block__icon">search</span>
              </a>
            </div>
          </div>
          {hook h='displayTopRight'}
          <div id="_mobile_user_info" class="d-md-none d-flex col-auto">
            <div class="header-block">
              <span class="header-block__action-btn">
                <i class="material-icons header-block__icon" aria-hidden="true">&#xE7FD;</i>
                <span class="d-none d-md-inline header-block__title">{l s='Sign in' d='Shop.Theme.Actions'}</span>
              </span>
            </div>
          </div>

          <div id="_mobile_cart" class="d-md-none col-auto d-flex">
            <div class="header-block d-flex align-items-center">
              <span class="header-block__action-btn">
                <i class="material-icons header-block__icon" aria-hidden="true">shopping_cart</i>
                <span class="header-block__badge">{$cart.products_count}</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
{/block}

{block name='header_search'}
  <div class="search__offcanvas js-search-offcanvas offcanvas offcanvas-top w-100 h-auto"
       id="searchCanvas"
       tabindex="-1"
       aria-labelledby="searchCanvasLabel"
       data-bs-backdrop="false"
       data-bs-scroll="true">
    <div class="offcanvas-header">
      <h2 id="searchCanvasLabel" class="visually-hidden">{l s='Search' d='Shop.Theme.Catalog'}</h2>
      {hook h='displaySearch'}
      <button type="button"
              class="btn-close text-reset ms-1"
              data-bs-dismiss="offcanvas"
              aria-label="{l s='Close' d='Shop.Theme.Global'}">
        {l s='Cancel' d='Shop.Theme.Global'}
      </button>
    </div>
  </div>
{/block}