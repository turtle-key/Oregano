<?php
class SocialloginAppleModuleFrontController extends ModuleFrontController
{
    public $ssl = true;

    public function initContent()
    {
        parent::initContent();

        $clientId = (string)Configuration::get('SL_APPLE_SERVICE_ID');
        $teamId   = (string)Configuration::get('SL_APPLE_TEAM_ID');
        $keyId    = (string)Configuration::get('SL_APPLE_KEY_ID');
        $privKey  = (string)Configuration::get('SL_APPLE_PRIVATE_KEY');

        if (!$clientId || !$teamId || !$keyId || !$privKey) {
            Tools::redirect('index.php?controller=authentication');
        }

        $redirectUri = $this->context->link->getModuleLink($this->module->name, 'apple', [], true);
        $stateKey = 'sl_state_apple';
        $code = Tools::getValue('code');
        $state = Tools::getValue('state');

        if ($code) {
            if (empty($state) || !isset($this->context->cookie->{$stateKey}) || $state !== $this->context->cookie->{$stateKey}) {
                die($this->module->trans('Security check failed (invalid state).', [], 'Modules.Sociallogin.Shop'));
            }
            unset($this->context->cookie->{$stateKey});

            $clientSecret = $this->buildAppleClientSecret($teamId, $keyId, $clientId, $privKey);
            if (!$clientSecret) {
                die($this->module->trans('Failed to create Apple client secret.', [], 'Modules.Sociallogin.Shop'));
            }

            $tokenUrl = 'https://appleid.apple.com/auth/token';
            $post = http_build_query([
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $redirectUri,
            ]);
            $token = $this->httpPostJson($tokenUrl, $post);
            if (!$token || empty($token['id_token'])) {
                die($this->module->trans('Could not obtain tokens from Apple.', [], 'Modules.Sociallogin.Shop'));
            }

            $payload = $this->decodeJwtPayload($token['id_token']);
            if (!$payload || empty($payload['sub'])) {
                die($this->module->trans('Could not validate Apple token.', [], 'Modules.Sociallogin.Shop'));
            }

            $email = isset($payload['email']) ? (string)$payload['email'] : ('apple_' . $payload['sub'] . '@privaterelay.appleid.com');
            $firstname = '';
            $lastname = '';

            Sociallogin::loginOrCreateCustomer($this->context, $email, $firstname, $lastname);

            $back = Tools::getValue('back');
            Tools::redirect($back ?: 'index.php?controller=my-account');
        }

        $stateValue = bin2hex(random_bytes(16));
        $this->context->cookie->{$stateKey} = $stateValue;

        $params = [
            'response_type' => 'code',
            'response_mode' => 'query',
            'client_id'     => $clientId,
            'redirect_uri'  => $redirectUri,
            'scope'         => 'name email',
            'state'         => $stateValue,
        ];
        $authUrl = 'https://appleid.apple.com/auth/authorize?' . http_build_query($params);
        Tools::redirect($authUrl);
    }

    protected function buildAppleClientSecret(string $teamId, string $keyId, string $clientId, string $privateKeyPem): ?string
    {
        $now = time();
        $claims = [
            'iss' => $teamId,
            'iat' => $now,
            'exp' => $now + 3000,
            'aud' => 'https://appleid.apple.com',
            'sub' => $clientId,
        ];
        $header = ['alg' => 'ES256', 'kid' => $keyId, 'typ' => 'JWT'];

        $segments = [
            $this->b64url(json_encode($header)),
            $this->b64url(json_encode($claims)),
        ];
        $signingInput = implode('.', $segments);

        $pkey = openssl_pkey_get_private($privateKeyPem);
        if (!$pkey) {
            return null;
        }

        $signature = '';
        $ok = openssl_sign($signingInput, $signature, $pkey, 'sha256');
        if (!$ok) {
            return null;
        }

        $jose = $this->derToJose($signature, 64);
        if ($jose === null) {
            return null;
        }

        $segments[] = $this->b64url($jose, true);
        return implode('.', $segments);
    }

    protected function b64url(string $data, bool $raw = false): string
    {
        $b = $raw ? $data : (string)$data;
        return rtrim(strtr(base64_encode($b), '+/', '-_'), '=');
    }

    protected function derToJose(string $der, int $partLen): ?string
    {
        $hex = unpack('H*', $der)[1];
        if (substr($hex, 0, 2) !== '30') return null;
        $pos = 2;
        $seqLen = hexdec(substr($hex, $pos, 2)); $pos += 2;
        if ($seqLen & 0x80) {
            $n = $seqLen & 0x7F;
            $pos += $n * 2;
        }
        if (substr($hex, $pos, 2) !== '02') return null; $pos += 2;
        $rLen = hexdec(substr($hex, $pos, 2)); $pos += 2;
        $rHex = substr($hex, $pos, $rLen * 2); $pos += $rLen * 2;
        if (substr($hex, $pos, 2) !== '02') return null; $pos += 2;
        $sLen = hexdec(substr($hex, $pos, 2)); $pos += 2;
        $sHex = substr($hex, $pos, $sLen * 2);

        $rHex = ltrim($rHex, '0');
        $sHex = ltrim($sHex, '0');
        $rHex = str_pad($rHex, $partLen * 2, '0', STR_PAD_LEFT);
        $sHex = str_pad($sHex, $partLen * 2, '0', STR_PAD_LEFT);

        $bin = hex2bin($rHex . $sHex);
        return $bin === false ? null : $bin;
    }

    protected function decodeJwtPayload(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) < 2) return null;
        $payload = $parts[1];
        $json = base64_decode(strtr($payload, '-_', '+/'), true);
        if ($json === false) return null;
        $data = json_decode($json, true);
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