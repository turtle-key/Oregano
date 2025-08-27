{*
  Uses theme styles + module CSS. No JS.
  Appears in:
  - displayCustomerLoginFormAfter
  - displayCustomerAccountForm
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
      <a class="sl-btn sl-btn--google" href="{$sl_google_link|default:''|escape:'html':'UTF-8'}">
        <span>{l s='Continue with Google' mod='sociallogin'}</span>
      </a>
    {/if}

    {if $_fb_on}
      <a class="sl-btn sl-btn--facebook" href="{$sl_facebook_link|default:''|escape:'html':'UTF-8'}">
        <span>{l s='Continue with Facebook' mod='sociallogin'}</span>
      </a>
    {/if}

    {if $_ap_on}
      <a class="sl-btn sl-btn--apple" href="{$sl_apple_link|default:''|escape:'html':'UTF-8'}">
        <span>{l s='Continue with Apple' mod='sociallogin'}</span>
      </a>
    {/if}
  </div>
</div>
{/if}