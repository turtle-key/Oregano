<?php
class SocialloginFacebookModuleFrontController extends ModuleFrontController
{
    public $ssl = true;

    public function initContent()
    {
        parent::initContent();

        $appId = (string)Configuration::get('SL_FB_APP_ID');
        $secret = (string)Configuration::get('SL_FB_APP_SECRET');
        if (!$appId || !$secret) {
            Tools::redirect('index.php?controller=authentication');
        }

        $redirectUri = $this->context->link->getModuleLink($this->module->name, 'facebook', [], true);
        $stateKey = 'sl_state_fb';
        $code = Tools::getValue('code');
        $state = Tools::getValue('state');

        if ($code) {
            if (empty($state) || !isset($this->context->cookie->{$stateKey}) || $state !== $this->context->cookie->{$stateKey}) {
                die($this->module->trans('Security check failed (invalid state).', [], 'Modules.Sociallogin.Shop'));
            }
            unset($this->context->cookie->{$stateKey});

            $tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token?' . http_build_query([
                'client_id' => $appId,
                'client_secret' => $secret,
                'redirect_uri' => $redirectUri,
                'code' => $code,
            ]);
            $token = $this->httpGetJson($tokenUrl);
            if (!$token || empty($token['access_token'])) {
                die($this->module->trans('Could not obtain access token from Facebook.', [], 'Modules.Sociallogin.Shop'));
            }

            $meUrl = 'https://graph.facebook.com/me?' . http_build_query([
                'fields' => 'id,first_name,last_name,email',
                'access_token' => $token['access_token'],
            ]);
            $me = $this->httpGetJson($meUrl);
            if (!$me || empty($me['id'])) {
                die($this->module->trans('Could not fetch Facebook profile.', [], 'Modules.Sociallogin.Shop'));
            }

            $email = isset($me['email']) ? $me['email'] : ('fb_' . $me['id'] . '@example.local');
            $firstname = $me['first_name'] ?? '';
            $lastname = $me['last_name'] ?? '';

            Sociallogin::loginOrCreateCustomer($this->context, $email, $firstname, $lastname);

            $back = Tools::getValue('back');
            Tools::redirect($back ?: 'index.php?controller=my-account');
        }

        $stateValue = bin2hex(random_bytes(16));
        $this->context->cookie->{$stateKey} = $stateValue;

        $authUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' . http_build_query([
            'client_id' => $appId,
            'redirect_uri' => $redirectUri,
            'state' => $stateValue,
            'scope' => 'email,public_profile',
            'response_type' => 'code',
        ]);
        Tools::redirect($authUrl);
    }

    protected function httpGetJson($url)
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        if ($out === false) return null;
        $data = json_decode($out, true);
        return is_array($data) ? $data : null;
    }
}