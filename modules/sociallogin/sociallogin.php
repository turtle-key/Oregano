<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

class Sociallogin extends Module
{
    public function __construct()
    {
        $this->name = 'sociallogin';
        $this->tab = 'front_office_features';
        $this->version = '1.3.4';
        $this->author = 'turtle-key';
        $this->need_instance = 0;
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('Social Login');
        $this->description = $this->l('Login/Register with Facebook, Google, and Apple using server-side OAuth.');
        $this->ps_versions_compliancy = ['min' => '8.0.0', 'max' => _PS_VERSION_];
    }

    public function install()
    {
        Configuration::updateValue('SL_ENABLE_FACEBOOK', 0);
        Configuration::updateValue('SL_ENABLE_GOOGLE', 0);
        Configuration::updateValue('SL_ENABLE_APPLE', 0);

        Configuration::updateValue('SL_FB_APP_ID', '');
        Configuration::updateValue('SL_FB_APP_SECRET', '');
        Configuration::updateValue('SL_GOOGLE_CLIENT_ID', '');
        Configuration::updateValue('SL_GOOGLE_CLIENT_SECRET', '');
        Configuration::updateValue('SL_APPLE_SERVICE_ID', '');
        Configuration::updateValue('SL_APPLE_TEAM_ID', '');
        Configuration::updateValue('SL_APPLE_KEY_ID', '');
        Configuration::updateValue('SL_APPLE_PRIVATE_KEY', '');

        $ok = parent::install()
            && $this->registerHook('actionFrontControllerSetMedia')
            && $this->registerHook('displayCustomerLoginFormAfter')
            && $this->registerHook('displayCustomerAccountForm');

        return $ok;
    }

    public function uninstall()
    {
        foreach ([
            'SL_ENABLE_FACEBOOK','SL_ENABLE_GOOGLE','SL_ENABLE_APPLE',
            'SL_FB_APP_ID','SL_FB_APP_SECRET',
            'SL_GOOGLE_CLIENT_ID','SL_GOOGLE_CLIENT_SECRET',
            'SL_APPLE_SERVICE_ID','SL_APPLE_TEAM_ID','SL_APPLE_KEY_ID','SL_APPLE_PRIVATE_KEY',
        ] as $k) {
            Configuration::deleteByName($k);
        }
        return parent::uninstall();
    }

    public function getContent()
    {
        // Serve docs only via AdminModules (BO) — prevents 403s and public access
        if (Tools::getIsset('sl_doc')) {
            $doc = (string)Tools::getValue('sl_doc', '');
            $allowed = ['facebook','google','apple'];
            if (!in_array($doc, $allowed, true)) {
                header('HTTP/1.1 404 Not Found');
                die('Not found');
            }
            $file = __DIR__ . '/views/docs/' . $doc . '.html';
            if (!is_file($file)) {
                header('HTTP/1.1 404 Not Found');
                die('Not found');
            }
            header('Content-Type: text/html; charset=utf-8');
            readfile($file);
            exit; // stop normal config rendering
        }

        $errors = [];

        if (Tools::isSubmit('submitSL')) {
            $fb_on = (int)Tools::getValue('SL_ENABLE_FACEBOOK', 0);
            $gg_on = (int)Tools::getValue('SL_ENABLE_GOOGLE', 0);
            $ap_on = (int)Tools::getValue('SL_ENABLE_APPLE', 0);

            $fb_id = trim((string)Tools::getValue('SL_FB_APP_ID', ''));
            $fb_secret = trim((string)Tools::getValue('SL_FB_APP_SECRET', ''));
            $gg_id = trim((string)Tools::getValue('SL_GOOGLE_CLIENT_ID', ''));
            $gg_secret = trim((string)Tools::getValue('SL_GOOGLE_CLIENT_SECRET', ''));
            $ap_sid = trim((string)Tools::getValue('SL_APPLE_SERVICE_ID', ''));
            $ap_team = trim((string)Tools::getValue('SL_APPLE_TEAM_ID', ''));
            $ap_keyid = trim((string)Tools::getValue('SL_APPLE_KEY_ID', ''));
            $ap_p8 = trim((string)Tools::getValue('SL_APPLE_PRIVATE_KEY', ''));

            if ($fb_on && (!$fb_id || !$fb_secret)) {
                $errors[] = $this->l('Facebook: enter App ID and App Secret before enabling.');
                $fb_on = 0;
            }
            if ($gg_on && (!$gg_id || !$gg_secret)) {
                $errors[] = $this->l('Google: enter Client ID and Client Secret before enabling.');
                $gg_on = 0;
            }
            if ($ap_on && (!$ap_sid || !$ap_team || !$ap_keyid || !$ap_p8)) {
                $errors[] = $this->l('Apple: enter Service ID, Team ID, Key ID and Private Key before enabling.');
                $ap_on = 0;
            }

            Configuration::updateValue('SL_ENABLE_FACEBOOK', $fb_on);
            Configuration::updateValue('SL_ENABLE_GOOGLE', $gg_on);
            Configuration::updateValue('SL_ENABLE_APPLE', $ap_on);

            Configuration::updateValue('SL_FB_APP_ID', $fb_id);
            Configuration::updateValue('SL_FB_APP_SECRET', $fb_secret);
            Configuration::updateValue('SL_GOOGLE_CLIENT_ID', $gg_id);
            Configuration::updateValue('SL_GOOGLE_CLIENT_SECRET', $gg_secret);
            Configuration::updateValue('SL_APPLE_SERVICE_ID', $ap_sid);
            Configuration::updateValue('SL_APPLE_TEAM_ID', $ap_team);
            Configuration::updateValue('SL_APPLE_KEY_ID', $ap_keyid);
            Configuration::updateValue('SL_APPLE_PRIVATE_KEY', $ap_p8);

            if ($errors) {
                foreach ($errors as $e) {
                    $this->context->controller->errors[] = $e;
                }
            } else {
                $this->context->controller->confirmations[] = $this->l('Settings updated.');
            }
        }

        // Build AdminModules link base with token — used for “Setup guide” links
        $adminDocsBase = $this->context->link->getAdminLink('AdminModules', true, [], [
            'configure' => $this->name,
            // sl_doc will be appended with the doc name
        ]);

        $helper = new HelperForm();
        $helper->show_toolbar = false;
        $helper->module = $this;
        $helper->table = $this->table;
        $helper->default_form_language = (int)Configuration::get('PS_LANG_DEFAULT');
        $helper->allow_employee_form_lang = (int)Configuration::get('PS_BO_ALLOW_EMPLOYEE_FORM_LANG');
        $helper->identifier = $this->identifier;
        $helper->submit_action = 'submitSL';
        $helper->currentIndex = $this->context->link->getAdminLink('AdminModules', false)
            .'&configure='.$this->name.'&tab_module='.$this->tab.'&module_name='.$this->name;
        $helper->token = Tools::getAdminTokenLite('AdminModules');

        $forms = [];

        $forms[] = [
            'form' => [
                'legend' => ['title' => $this->l('Facebook'), 'icon' => 'icon-facebook'],
                'description' => sprintf(
                    '%s <a href="%s" target="_blank" rel="noopener">%s</a>',
                    $this->l('Configure Facebook Login.'),
                    $adminDocsBase . '&sl_doc=facebook',
                    $this->l('Setup guide')
                ),
                'input' => [
                    ['type' => 'switch','label' => $this->l('Enable'),'name' => 'SL_ENABLE_FACEBOOK','is_bool' => true,
                        'values' => [
                            ['id' => 'fb_on','value' => 1,'label' => $this->l('Yes')],
                            ['id' => 'fb_off','value' => 0,'label' => $this->l('No')],
                        ]],
                    ['type' => 'text','label' => $this->l('App ID'),'name' => 'SL_FB_APP_ID','col' => 6,
                        'desc' => $this->l('Valid OAuth Redirect URI:').' '.$this->getCallbackUrl('facebook')],
                    ['type' => 'text','label' => $this->l('App Secret'),'name' => 'SL_FB_APP_SECRET','col' => 6],
                ],
                'submit' => ['title' => $this->l('Save')],
            ],
        ];

        $forms[] = [
            'form' => [
                'legend' => ['title' => $this->l('Google'), 'icon' => 'icon-google'],
                'description' => sprintf(
                    '%s <a href="%s" target="_blank" rel="noopener">%s</a>',
                    $this->l('Configure Google Sign-In.'),
                    $adminDocsBase . '&sl_doc=google',
                    $this->l('Setup guide')
                ),
                'input' => [
                    ['type' => 'switch','label' => $this->l('Enable'),'name' => 'SL_ENABLE_GOOGLE','is_bool' => true,
                        'values' => [
                            ['id' => 'gg_on','value' => 1,'label' => $this->l('Yes')],
                            ['id' => 'gg_off','value' => 0,'label' => $this->l('No')],
                        ]],
                    ['type' => 'text','label' => $this->l('Client ID'),'name' => 'SL_GOOGLE_CLIENT_ID','col' => 6,
                        'desc' => $this->l('Authorized redirect URI:').' '.$this->getCallbackUrl('google')],
                    ['type' => 'text','label' => $this->l('Client Secret'),'name' => 'SL_GOOGLE_CLIENT_SECRET','col' => 6],
                ],
                'submit' => ['title' => $this->l('Save')],
            ],
        ];

        $forms[] = [
            'form' => [
                'legend' => ['title' => $this->l('Apple'), 'icon' => 'icon-apple'],
                'description' => sprintf(
                    '%s <a href="%s" target="_blank" rel="noopener">%s</a>',
                    $this->l('Configure Sign in with Apple.'),
                    $adminDocsBase . '&sl_doc=apple',
                    $this->l('Setup guide')
                ),
                'input' => [
                    ['type' => 'switch','label' => $this->l('Enable'),'name' => 'SL_ENABLE_APPLE','is_bool' => true,
                        'values' => [
                            ['id' => 'ap_on','value' => 1,'label' => $this->l('Yes')],
                            ['id' => 'ap_off','value' => 0,'label' => $this->l('No')],
                        ]],
                    ['type' => 'text','label' => $this->l('Service ID (client_id)'),'name' => 'SL_APPLE_SERVICE_ID','col' => 6,
                        'desc' => $this->l('Return URL:').' '.$this->getCallbackUrl('apple')],
                    ['type' => 'text','label' => $this->l('Team ID'),'name' => 'SL_APPLE_TEAM_ID','col' => 6],
                    ['type' => 'text','label' => $this->l('Key ID'),'name' => 'SL_APPLE_KEY_ID','col' => 6],
                    ['type' => 'textarea','label' => $this->l('Private Key (.p8 contents)'),'name' => 'SL_APPLE_PRIVATE_KEY','rows' => 6,'col' => 12],
                ],
                'submit' => ['title' => $this->l('Save')],
            ],
        ];

        $helper->fields_value = [
            'SL_ENABLE_FACEBOOK' => (int)Configuration::get('SL_ENABLE_FACEBOOK'),
            'SL_ENABLE_GOOGLE'   => (int)Configuration::get('SL_ENABLE_GOOGLE'),
            'SL_ENABLE_APPLE'    => (int)Configuration::get('SL_ENABLE_APPLE'),
            'SL_FB_APP_ID'             => (string)Configuration::get('SL_FB_APP_ID'),
            'SL_FB_APP_SECRET'         => (string)Configuration::get('SL_FB_APP_SECRET'),
            'SL_GOOGLE_CLIENT_ID'      => (string)Configuration::get('SL_GOOGLE_CLIENT_ID'),
            'SL_GOOGLE_CLIENT_SECRET'  => (string)Configuration::get('SL_GOOGLE_CLIENT_SECRET'),
            'SL_APPLE_SERVICE_ID'      => (string)Configuration::get('SL_APPLE_SERVICE_ID'),
            'SL_APPLE_TEAM_ID'         => (string)Configuration::get('SL_APPLE_TEAM_ID'),
            'SL_APPLE_KEY_ID'          => (string)Configuration::get('SL_APPLE_KEY_ID'),
            'SL_APPLE_PRIVATE_KEY'     => (string)Configuration::get('SL_APPLE_PRIVATE_KEY'),
        ];

        return $helper->generateForm($forms);
    }

    public function hookActionFrontControllerSetMedia($params)
    {
        // keep front CSS
        $this->context->controller->registerStylesheet(
            'module-sociallogin-front',
            'modules/'.$this->name.'/views/css/sociallogin.css',
            ['media' => 'all', 'priority' => 50]
        );
    }

    public function hookDisplayCustomerLoginFormAfter($params)
    {
        if ($this->context->customer->isLogged()) {
            return '';
        }
        return $this->renderButtons(false);
    }

    public function hookDisplayCustomerAccountForm($params)
    {
        if ($this->context->customer->isLogged()) {
            return '';
        }
        return $this->renderButtons(false);
    }

    protected function renderButtons($isCheckout = false)
    {
        $fb = (bool)(Configuration::get('SL_ENABLE_FACEBOOK') && Configuration::get('SL_FB_APP_ID') && Configuration::get('SL_FB_APP_SECRET'));
        $gg = (bool)(Configuration::get('SL_ENABLE_GOOGLE') && Configuration::get('SL_GOOGLE_CLIENT_ID') && Configuration::get('SL_GOOGLE_CLIENT_SECRET'));
        $ap = (bool)(Configuration::get('SL_ENABLE_APPLE') && Configuration::get('SL_APPLE_SERVICE_ID') && Configuration::get('SL_APPLE_TEAM_ID') && Configuration::get('SL_APPLE_KEY_ID') && Configuration::get('SL_APPLE_PRIVATE_KEY'));

        if (!$fb && !$gg && !$ap) {
            return '';
        }

        $backUrl = $this->computeBackUrl($isCheckout);

        $this->context->smarty->assign([
            'sl_enable_facebook' => $fb,
            'sl_enable_google'   => $gg,
            'sl_enable_apple'    => $ap,
            'sl_facebook_link'   => $this->context->link->getModuleLink($this->name, 'facebook', ['back' => $backUrl], true),
            'sl_google_link'     => $this->context->link->getModuleLink($this->name, 'google',   ['back' => $backUrl], true),
            'sl_apple_link'      => $this->context->link->getModuleLink($this->name, 'apple',    ['back' => $backUrl], true),
            // NEW: base path for images (modules/sociallogin/views/img/)
            'sl_img_dir'         => $this->_path . 'views/img/',
        ]);

        return $this->display(__FILE__, 'views/templates/hook/loginButtons.tpl');
    }

    protected function getCallbackUrl($provider)
    {
        return $this->context->link->getModuleLink($this->name, $provider, [], true);
    }

    protected function isCheckoutContext(): bool
    {
        $c = $this->context->controller;
        $name = $c ? (string)$c->php_self : '';
        return in_array($name, ['order', 'orderopc', 'checkout'], true);
    }

    protected function computeBackUrl(bool $isCheckout): string
    {
        $back = (string)Tools::getValue('back');
        if (!empty($back)) {
            return $back;
        }
        if ($isCheckout || $this->isCheckoutContext()) {
            return $this->context->link->getPageLink('order', true);
        }
        return $this->context->link->getPageLink('my-account', true);
    }

    public static function loginOrCreateCustomer(Context $context, $email, $firstname, $lastname)
    {
        $email = trim((string)$email);
        $firstname = trim((string)$firstname);
        $lastname = trim((string)$lastname);
        if (!Validate::isEmail($email)) {
            return false;
        }
        $customer = new Customer();
        $authentication = $customer->getByEmail($email);
        if ($authentication && $customer->id) {
            self::performLogin($context, $customer);
            return (int)$customer->id;
        }

        $customer = new Customer();
        $customer->firstname = $firstname ?: '—';
        $customer->lastname = $lastname ?: '—';
        $customer->email = $email;
        $customer->id_lang = (int)$context->language->id;
        $customer->id_shop = (int)$context->shop->id;
        $customer->active = 1;

        $plainPassword = Tools::passwdGen(12);
        $customer->passwd = method_exists('Tools', 'hash') ? Tools::hash($plainPassword) : Tools::encrypt($plainPassword);

        if (!$customer->add()) {
            return false;
        }
        self::performLogin($context, $customer);
        return (int)$customer->id;
    }

    protected static function performLogin(Context $context, Customer $customer)
    {
        Hook::exec('actionBeforeAuthentication');
        $context->cookie->id_customer = (int)$customer->id;
        $context->cookie->customer_lastname = (string)$customer->lastname;
        $context->cookie->customer_firstname = (string)$customer->firstname;
        $context->cookie->logged = 1;
        $context->cookie->check_cgv = 0;
        $context->cookie->is_guest = (int)$customer->isGuest();
        $context->cookie->passwd = (string)$customer->passwd;
        $context->cookie->email = (string)$customer->email;

        $customer->logged = 1;
        $context->customer = $customer;
        $context->updateCustomer($customer);

        if (Configuration::get('PS_CART_FOLLOWING') && (empty($context->cookie->id_cart) || 0 == Cart::getNbProducts($context->cookie->id_cart))) {
            $idCart = (int)Cart::lastNoneOrderedCart($context->customer->id);
            if ($idCart) {
                $context->cart = new Cart($idCart);
            }
        }

        if (!isset($context->cart) || !$context->cart->id) {
            $context->cart = new Cart();
            $context->cart->id_shop_group = (int)$context->shop->id_shop_group;
            $context->cart->id_shop = (int)$context->shop->id;
            $context->cart->id_lang = (int)$context->language->id;
            $context->cart->id_currency = (int)$context->currency->id;
            $context->cart->id_customer = (int)$customer->id;
            $context->cart->save();
        } else {
            $context->cart->id_customer = (int)$customer->id;
            $context->cart->secure_key = $customer->secure_key;
            $context->cart->save();
        }

        $context->cookie->id_cart = (int)$context->cart->id;
        $context->cart->autosetProductAddress();

        Hook::exec('actionAuthentication');
        CartRule::autoRemoveFromCart($context);
        CartRule::autoAddToCart($context);
    }
}