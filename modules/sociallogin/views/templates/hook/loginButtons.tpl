{*
  Social Login buttons with image icons (Bon-style)
  - Uses module CSS + SVG image files
  - Appears in:
    - displayCustomerLoginFormAfter
    - displayCustomerAccountForm
    - displayCheckoutLoginFormTop (if your theme calls it)
*}
{assign var=_fb_on value=$sl_enable_facebook|default:false}
{assign var=_gg_on value=$sl_enable_google|default:false}
{assign var=_ap_on value=$sl_enable_apple|default:false}

{if $_fb_on || $_gg_on || $_ap_on}
<div class="sl-auth">
  <div class="sl-auth__divider">
    <span>{l s='or continue with' mod='sociallogin'}</span>
  </div>

  <div class="sl-auth__buttons">
    {if $_gg_on}
      <a class="sl-btn sl-btn--google" href="{$sl_google_link|default:''|escape:'html':'UTF-8'}" aria-label="{l s='Continue with Google' mod='sociallogin'}">
        <span class="sl-btn__icon" aria-hidden="true">
          <img src="{$sl_img_dir|escape:'html':'UTF-8'}google.svg" alt="" loading="lazy" width="20" height="20">
        </span>
        <span class="sl-btn__text">{l s='Continue with Google' mod='sociallogin'}</span>
      </a>
    {/if}

    {if $_fb_on}
      <a class="sl-btn sl-btn--facebook" href="{$sl_facebook_link|default:''|escape:'html':'UTF-8'}" aria-label="{l s='Continue with Facebook' mod='sociallogin'}">
        <span class="sl-btn__icon" aria-hidden="true">
          <img src="{$sl_img_dir|escape:'html':'UTF-8'}facebook.svg" alt="" loading="lazy" width="18" height="18">
        </span>
        <span class="sl-btn__text">{l s='Continue with Facebook' mod='sociallogin'}</span>
      </a>
    {/if}

    {if $_ap_on}
      <a class="sl-btn sl-btn--apple" href="{$sl_apple_link|default:''|escape:'html':'UTF-8'}" aria-label="{l s='Sign in with Apple' mod='sociallogin'}">
        <span class="sl-btn__icon" aria-hidden="true">
          <img src="{$sl_img_dir|escape:'html':'UTF-8'}apple.svg" alt="" loading="lazy" width="18" height="18">
        </span>
        <span class="sl-btn__text">{l s='Sign in with Apple' mod='sociallogin'}</span>
      </a>
    {/if}
  </div>
</div>
{/if}