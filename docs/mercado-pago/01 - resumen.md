# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/overview.md

Integrate Checkout API and customize the whole experience Incorporate a flexible API into your website so that customers can shop on your website or app without being redirected to an external page.

For online payments

Advanced integration

Without redirect

Total customization

Looking for development-free options? Explore [other solutions](https://www.mercadopago.com.ar/developers/en/docs#online-payments).

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/30/1748643765632-AR.EN.png)

What it offers Combine different features to ensure transaction security and conversion.

Customization and security

- Build your checkout tailored to your preferences.
- Receive card transaction data securely and with minimal hassle, enabling a simplified path to PCI certification.

Flexibility to integrate

- Adapt the integration to your business needs.
- Choose how transactions will be processed: [manually or automatically](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model#bookmark%5Fprocessing%5Fmodes%5Ffor%5Forders).

Payment optimization

- Offer a purchasing process with just a few steps.
- Ensure a practical and secure completion of the purchase.

How it works

The customer chooses the product or service, and the entire purchase and payment process takes place in your store, with the security of Mercado Pago and without leaving your website.

[ How to integrate ](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/create-application)

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/5/1746459185035-overvieworderses.gif)

[ Check the processing rates ](https://www.mercadopago.com.ar/developers/es/support/37740)

Payment process

1. Buyers select their preferred products or services on your website.
2. Once in the payment screen, they choose one of the payment methods integrated to your checkout.
3. Then, they must provide the necessary details and complete the purchase without leaving your store.
4. Once Mercado Pago's APIs process the payment, the purchase is confirmed.
   [ How to integrate ](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/create-application)

What sets it apartCompare our checkouts and choose the option that best fits your business. Check the [rates](https://www.mercadopago.com.ar/developers/pt/support/37740).

You're here

![](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/26/1758911094301-overviewmlcmcoen.png)Checkout API[How to integrate](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/overview#:~:text=UY-,How,-to%20integrate)

Checkout Bricks[Go to summary](https://www.mercadopago.com.ar/developers/en/docs/checkout-bricks/overview)

Checkout Pro[Go to summary](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview)

Integration effort

Integration effort

Integration effort

Integration effort

Customization level

Customization level

Customization level

Customization level

Design ready to set up

Design ready to set up

\-

Design ready to set up

Design ready to set up

Collection experience

Collection experience

On your website

Collection experience

On your website

Collection experience

On Mercado Pago

Payment methods

Payment methods

Credit or debit card, Rapipago and Pago Fácil

Payment methods

Credit or debit card, Rapipago, Pago Fácil, Mercado Pago Wallet and Installments without Card

Payment methods

Credit or debit card, Rapipago, Pago Fácil, Mercado Pago Wallet and Installments without Card

Availability by country

Availability by country

BR

AR

MX

CL

CO

PE

UY

Availability by country

AR

BR

CL

CO

MX

PE

UY

Availability by country

AR

BR

CL

CO

MX

PE

UY

How to integrate

Learn about the steps you need to follow to integrate this solution.

Previous requirements

- **Mercado Pago Account**  
  You need to create a user on Mercado Pago or Mercado Libre to have a [seller account](https://www.mercadopago.com.ar/hub/registration/landing).

Integration process

1. [Create an application](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/create-application) from [Your integrations](https://www.mercadopago.com.ar/developers/panel/app).
2. [Configure the development environment](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/development-environment).
3. [Configure your preferred payment methods](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-integration).
4. [Configure payment notifications](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/notifications).
5. [Test your integration](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-test).
6. [Measure integration quality](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-quality).
7. [Go to production](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/go-to-production).
   [ I want to start integrating ](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/create-application)

flowchart TD
A[Your integrations] --> B[Create an application]
B --> C[Configure development environment]
C --> D[Configure payment method]
D --> E[Configure payment notifications]
E --> F[Test your integration]
F --> G{Was the test successful?}
G -- No --> H[Fix configuration] --> F
G -- Yes --> I[Measure integration quality]
I --> J{What do you want to do?}
J -- Go live --> K[Go to production]
J -- Configure another payment method --> D
