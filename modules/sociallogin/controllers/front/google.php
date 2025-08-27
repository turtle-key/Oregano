<?php
class SocialloginGoogleModuleFrontController extends ModuleFrontController
{
    public $ssl = true;

    public function initContent()
    {
        parent::initContent();

        $clientId = (string)Configuration::get('SL_GOOGLE_CLIENT_ID');
        $clientSecret = (string)Configuration::get('SL_GOOGLE_CLIENT_SECRET');
        if (!$clientId || !$clientSecret) {
            Tools::redirect('index.php?controller=authentication');
        }

        $redirectUri = $this->context->link->getModuleLink($this->module->name, 'google', [], true);
        $stateKey = 'sl_state_google';
        $code = Tools::getValue('code');
        $state = Tools::getValue('state');

        if ($code) {
            if (empty($state) || !isset($this->context->cookie->{$stateKey}) || $state !== $this->context->cookie->{$stateKey}) {
                die($this->module->trans('Security check failed (invalid state).', [], 'Modules.Sociallogin.Shop'));
            }
            unset($this->context->cookie->{$stateKey});

            $tokenUrl = 'https://oauth2.googleapis.com/token';
            $post = http_build_query([
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'code' => $code,
                'grant_type' => 'authorization_code',
            ]);
            $token = $this->httpPostJson($tokenUrl, $post);
            if (!$token || empty($token['id_token'])) {
                die($this->module->trans('Could not obtain tokens from Google.', [], 'Modules.Sociallogin.Shop'));
            }

            $info = $this->httpGetJson('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token['id_token']));
            if (!$info || empty($info['email'])) {
                die($this->module->trans('Could not validate Google token.', [], 'Modules.Sociallogin.Shop'));
            }

            $email = (string)$info['email'];
            $firstname = (string)($info['given_name'] ?? '');
            $lastname = (string)($info['family_name'] ?? '');

            Sociallogin::loginOrCreateCustomer($this->context, $email, $firstname, $lastname);

            $back = Tools::getValue('back');
            Tools::redirect($back ?: 'index.php?controller=my-account');
        }

        $stateValue = bin2hex(random_bytes(16));
        $this->context->cookie->{$stateKey} = $stateValue;

        $authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $stateValue,
            'access_type' => 'online',
            'include_granted_scopes' => 'true',
            'prompt' => 'select_account',
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

    protected function httpPostJson($url, $postQuery)
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postQuery,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
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