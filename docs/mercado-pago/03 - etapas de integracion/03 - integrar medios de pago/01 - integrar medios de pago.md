# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/payment-integration.md

\# Integrate payment methods With Checkout API, you can choose which payment methods you want to make available in online stores. The integration process is based on the \*\*individual configuration of each of these payment methods within the previously established common environment\*\*, which facilitates the integration experience while allowing for a greater level of customization. If you want to, you can check a detailed list of all these payment methods available for integration by sending a \*\*GET\*\* with your :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."} to the endpoint :TagComponent{tag="API" text="/v1/payment\_methods" href="/developers/en/reference/online-payments/checkout-api/payment-methods/get"} and execute the request, or if you prefer, use one of the code snippets below.

- [csharp ](#editor%5F5)
- [curl ](#editor%5F7)
- [java ](#editor%5F3)
- [node ](#editor%5F2)
- [php ](#editor%5F1)
- [python ](#editor%5F6)
- [ruby ](#editor%5F4)
  php node java ruby csharp python curl

```
<?php
  use MercadoPago\MercadoPagoConfig;

  MercadoPagoConfig::setAccessToken("<YOUR_ACCESS_TOKEN>");

  $client = new PaymentMethodClient();
  $payment_method = $client->get();

?>
```

Copiar

```
import { MercadoPagoConfig, PaymentMethods } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: 'access_token' });
const paymentMethods = new PaymentMethods(client);

paymentMethods.get().then((result) => console.log(result))
  .catch((error) => console.log(error));
```

Copiar

```
MercadoPagoConfig.setAccessToken("<YOUR_ACCESS_TOKEN>");

PaymentMethodClient client = new PaymentMethodClient();
client.list();
```

Copiar

```
require 'mercadopago'
sdk = Mercadopago::SDK.new('<YOUR_ACCESS_TOKEN>')

payment_methods_response = sdk.payment_methods.get()
payment_methods = payment_methods_response[:response]
```

Copiar

```
using MercadoPago.Client.PaymentMethod;
using MercadoPago.Config;
using MercadoPago.Resource;
using MercadoPago.Resource.PaymentMethod;

MercadoPagoConfig.AccessToken = "<YOUR_ACCESS_TOKEN>";

var client = new PaymentMethodClient();
ResourcesList<PaymentMethod> paymentMethods = await client.ListAsync();
```

Copiar

```
import mercadopago
sdk = mercadopago.SDK("ACCESS_TOKEN")

payment_methods_response = sdk.payment_methods().list_all()
payment_methods = payment_methods_response["response"]
```

Copiar

```
curl -X GET \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <YOUR_ACCESS_TOKEN>' \
  'https://api.mercadopago.com/v1/payment_methods' \
```

Copiar

With this information, you can now select the payment methods you want to offer and proceed with your integration. > NOTE > > Remember: before setting up the payment methods, choose the way you will process your transactions. The processing mode, whether \*\*manual or automatic\*\*, will be defined at the time of order creation, using the \`processing\_mode\` parameter. For more information, visit the section \[Integration model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model).

#

Cards

Securely receive payments with credit or debit cards through a payment form within the checkout.

[ How to integrate ](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-integration/cards)

Rapipago and Pago Fácil

Receive the deferred payments that the customer makes through Rapipago or Pago Fácil in your account.

[ How to integrate ](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-integration/rapipago-pagofacil)
