$APPLICATION_ID = "1835491116686888";
$APPLICATION_SECRET = "b46eb511f1dbe0d54afc6c93f3056dda";

$token_url =    "https://graph.facebook.com/oauth/access_token?" .
                "client_id=" . $APPLICATION_ID .
                "&client_secret=" . $APPLICATION_SECRET .
                "&grant_type=client_credentials";
$app_token = file_get_contents($token_url);
echo $app_token;