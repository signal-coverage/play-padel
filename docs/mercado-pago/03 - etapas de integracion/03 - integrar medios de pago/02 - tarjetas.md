# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/payment-integration/cards.md

\# Cards The integration of payments with credit and/or debit cards in Checkout API can be done in two ways. The \*\*recommended integration\*\* is through the \*\*\_Card Payment Brick\_\*\*, where the Brick takes care of retrieving the necessary information to process the payment. However, if you prefer to be responsible for determining how this information will be retrieved, you can perform your integration using \*\*\_Core Methods\_\*\*, available for websites and Android and iOS mobile applications. :::::TabsComponent ::::TabComponent{title="Card Payment Brick (Web)"} In the integration through the \_Card Payment Brick\_ for websites, the \`MercadoPago.js\` library, included in your project during the \[configuration of the development environment\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/development-environment), is responsible for obtaining the information required for processing a payment. This means it searches for the types of documents available for the corresponding country, and as the card data is entered, it also retrieves information related to the issuer and the available installments. All information involved in processing the transaction is stored in the backend, in compliance with \[PCI security\](https://www.mercadopago.com.ar/developers/en/docs/security/pci) standards. In addition, the component provides the ability to guide the user with alerts for incomplete fields or possible errors when filling out the data, optimizing the purchasing process. With this, the implementation of the flow is transparent for those who are performing the integration, as shown in the diagram below.

sequenceDiagram
participant Buyer's Browser
participant Integrator Front-end
participant MercadoPago.js
participant Integrator Back-end
participant Mercado Pago API

Buyer's Browser->>Integrator Front-end: 1. The buyer accesses the payment screen.
Integrator Front-end->>MercadoPago.js: 2. The integrator's front-end downloads and initializes Mercado Pago's JS SDK.
Integrator Front-end->>Buyer's Browser: 3. The integrator's front-end displays the payment form.
Buyer's Browser->>Integrator Front-end: 4. The buyer completes the form and submits the payment.
Integrator Front-end->>MercadoPago.js: 5. The integrator's front-end uses the JS SDK to create a token containing the card data securely.
Integrator Front-end->>Integrator Back-end: 6. The integrator's front-end sends the card token and payment data to its back-end.
Integrator Back-end->>Mercado Pago API: 7. The back-end calls Mercado Pago services to create the payment.
Mercado Pago API->>Buyer's Browser: 8. The integrator's front-end shows the buyer the result of the transaction.
Mercado Pago API->>Integrator Back-end: 9. Mercado Pago may send notifications via Webhook with payment status updates.
Integrator Back-end->>Buyer's Browser: 10. If applicable, the buyer is notified about the payment update.

To proceed with the setup of debit and/or credit card payments via \_Card Payment Brick\_, follow the steps below. > NOTE > > Remember: before setting up the payment methods, choose the way you will process your transactions. The processing mode, whether \*\*manual or automatic\*\*, will be defined at the time of order creation, using the \`processing\_mode\` parameter. For more information, visit the section \[Integration model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model). :::AccordionComponent{title="Add payment form" pill="client-side"} To receive payments, you need to add a form in the frontend that allows for securely capturing the payer's information and enables card encryption. This inclusion should be done through the \_Card Payment Brick\_, which offers an optimized form with various themes and includes the necessary fields for card payments. To add the Card Payment Brick, first \*\*configure and initialize\*\* it from the frontend, as shown in the examples below.

- [javascript ](#editor%5F1)
  javascript

```
const renderCardPaymentBrick = async (bricksBuilder) => {
  const settings = {
  initialization: {
  amount: 100.99, // total amount to be paid
  },
  callbacks: {
  onReady: () => {
  /*
  Callback called when Brick is ready.
  Here you can hide loadings from your site, for example.
  */
  },
  onSubmit: (formData, additionalData) => {
  // callback called when clicking on the submit data button
  return new Promise((resolve, reject) => {
  const submitData = {
  type: "online",
  total_amount: String(formData.transaction_amount), // should be a string in the format 00.00
  external_reference: "ext_ref_1234", // identifier of the transaction source
  processing_mode: "automatic",
  transactions: {
  payments: [
  {
  amount: String(formData.transaction_amount), // should be a string in the format 00.00
  payment_method: {
  id: formData.payment_method_id,
  type: additionalData.paymentTypeId,
  token: formData.token,
  installments: formData.installments,
  },
  },
  ],
  },
  payer: {
  email: formData.payer.email,
  identification: formData.payer.identification,
  },
  };

  fetch("/process_order", {
  method: "POST",
  headers: {
  "Content-Type": "application/json",
  },
  body: JSON.stringify(submitData),
  })
  .then((response) => response.json())
  .then((response) => {
  // receive payment result
  resolve();
  })
  .catch((error) => {
  // handle error response when trying to create payment
  reject();
  });
  });
  },
  onError: (error) => {
  // callback called for all Brick error cases
  console.error(error);
  },
  },
  };
  window.cardPaymentBrickController = await bricksBuilder.create(
  "cardPayment",
  "cardPaymentBrick_container",
  settings
  );
};
renderCardPaymentBrick(bricksBuilder);
```

Copiar

The \`onSubmit\` callback of the Brick will obtain the minimum necessary data for creating a payment. Among those minimal data, there is the \`CardToken\`, that safely represents the card data. This token can only be used once, and will expire within 7 days. In addition to the minimum data, we recommend collecting additional details or those that can facilitate the recognition of the purchase by the buyer, thus increasing the payment approval rate. Consult our \[API Reference\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/create-order/post) for detailed information on all the parameters to be sent when creating a payment, including those that could improve your approval rate, and check which ones you want to include at this stage. Then, add the relevant fields to the object being sent, which are returned in the callback response. > WARNING > > Whenever the user leaves the screen where some Brick is displayed, it is necessary to destroy the current instance with the command \`window.cardPaymentBrickController.unmount()\`. When entering again, a new instance must be generated. Finally, \*\*render\*\* the Brick using one of the examples below.

- [html ](#editor%5F2)
  html

```
<div id="cardPaymentBrick_container"></div> // The ID must match the value sent in the create() method in the previous step
```

Copiar

As a result, the rendering of the Brick will look similar to the image below. !\[cardform\](https://www.mercadopago.com.ar/api-orders/card-form-mla-en.png) To move on to the payment submission stage, your backend must be able to receive the information from the created form, along with the token resulting from the card encryption. For this, we recommend providing an endpoint \*/Process\_order\* that accommodates the data collected by the Brick after performing the submit action. > NOTE > > To configure the installments displayed on the frontend, see the \[Configure installments\](https://www.mercadopago.com.ar/developers/en/docs/checkout-bricks/card-payment-brick/advanced-features/configure-installments) section of the Card Payment Brick. If you want to configure interest-free installments, please refer to the \[Support Center documentation\](https://www.mercadopago.com.ar/developers/es/support/cuotas-sin-interes\_3299). ::: :::AccordionComponent{title="Submit payment" pill="server-side"} The payment submission must be made by creating an order that contains associated payment transactions. To do this, send a \*\*POST\*\* with your :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."} and the required parameters listed below to the endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/en/reference/online-payments/checkout-api/create-order/post"} and execute the request. \`\`\`curl curl -X POST \\ 'https://api.mercadopago.com/v1/orders'\\ -H 'Content-Type: application/json' \\ -H 'X-Idempotency-Key: ' \\ -H 'Authorization: Bearer ' \\ -d '{ "type": "online", "processing\_mode": "automatic", "total\_amount": "50.00", "external\_reference": "ext\_ref\_1234", "payer": { "email": "test@testuser.com" }, "transactions": { "payments": \[ { "amount": "50.00", "payment\_method": { "id": "master", "type": "credit\_card", "token": "1223123", "installments": 1 } } \] } }' \`\`\` > NOTE > > Order creation is subject to request limits per client. If you receive a \`429 Too Many Requests\` error, wait the time indicated in the \`Retry-After\` response header before retrying. See \[Possible errors\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors) for more details. See the table below for descriptions of the parameters that have some important particularity that should be highlighted. | Parameter | Type | Description | Requirement | |---------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------| | \`Authorization\` | \_Header\_ | Refers to your private key, the :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."}. | Required | | \`X-Idempotency-Key\` | \_Header\_ | Idempotency key. It is used to ensure that each request is processed only once, avoiding duplications. Use a unique value in the header of your request, such as a UUID V4 or random strings. | Required | | \`processing\_mode\` | \_Body. String\_ | Processing mode of the order. The possible values are:

\- \`automatic\`: to create and process the order in automatic mode.

\- \`manual\`: to create the order and process it later.

For more information, visit the section \[Integration model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model). | Required | | \`total\_amount\` | \_Body. String\_ | Total amount for the transaction. | Required | | \`transaction.payments.payment\_method.id\` | \_Body. String\_ | Payment method identifier. \*\*In this case, it is the brand of each card\*\*. You can check the complete list of available identifiers by sending a request to the \[Get payment methods\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/payment-methods/get) endpoint. | Required | | \`transaction.payments.payment\_method.type\` | \_Body. String\_ | Payment method type. For credit card payments, it should be \`credit\_card\`, and for debit card payments, it should be \`debit\_card\`. | Required | | \`transaction.payments.payment\_method.token\` | \_Body. String\_ | Card token. Required for credit and debit card payments. | Required | > SUCCESS\_MESSAGE > > To learn in detail about all the parameters sent and returned in this request, please refer to our \[API Reference\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/create-order/post). Additionally, if you receive an error when submitting the payment, you can consult our \[list of errors\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors). In case of success, the response will look like the example below. \`\`\`json { "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP", "type": "online", "processing\_mode": "automatic", "external\_reference": "ext\_ref\_1234", "total\_amount": "50.00", "total\_paid\_amount": "200.00", "country\_code": "BRA", "user\_id": "2021490138", "status": "processed", "status\_detail": "accredited", "capture\_mode": "automatic", "created\_date": "2025-04-17T21:41:33.96Z", "last\_updated\_date": "2025-04-17T21:41:35.144Z", "integration\_data": { "application\_id": "874202490252970" }, "transactions": { "payments": \[ { "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34", "amount": "50.00", "paid\_amount": "47.28", "reference\_id": "0002yjis6j", "status": "processed", "status\_detail": "accredited", "payment\_method": { "id": "elo", "type": "credit\_card", "token": "519ada5ac7431ef6ce24ac19c38f6768", "installments": 1 } } \] } } \`\`\` Among the returned parameters, the ones indicated in the table below stand out. | Parameter | Type | Description | |---|---|---| | \`transactions.payments.status\` | \_String\_ | Transaction status. For example, \`processed\` indicates the payment was approved. See the \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) section for all possible values. | | \`transactions.payments.status\_detail\` | \_String\_ | Transaction status detail. For example, \`accredited\` indicates the payment was approved and credited. | | \`transactions.payments.paid\_amount\` | \_String\_ | Amount actually paid in the transaction. | > WARNING > > If you created the order manually, remember that processing the payment requires an additional step, which is the call to the Process order API. Additionally, this mode will allow you to reserve and capture funds. Refer to the \[Reserve, capture, and cancel funds\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/reserve-capture-cancel) section for more information. Once the order and payment are created, you can check the possible statuses by going to the \[Order status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/order-status) and \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) sections, respectively. ::: :::: ::::TabComponent{title="Core Methods (Web)"} In the integration via \_Core Methods\_ for websites, the developer is responsible for defining how the necessary information to complete the payment will be retrieved, including information about the type of document and about the card (issuer and installments). This allows for complete flexibility in building the checkout flow experience, unlike the integration via \_Card Payment Brick\_, where the information retrieval is done automatically and the interface is pre-established. Check out the diagram below that illustrates the payment process using a card with \_Core Methods\_.

sequenceDiagram
participant Client as Client's Browser
participant Frontend as Seller's Frontend
participant MPjs as MercadoPago.js
participant Backend as Seller's Backend
participant API as Mercado Pago API
Client->>Frontend: 1.1 Accesses the site to make a payment
Frontend->>MPjs: 1.2 new MercadoPago(PUBLIC_KEY)
Frontend->>MPjs: 1.3 getIdentificationTypes()
MPjs-->>Frontend: 1.4 identificationTypes
Frontend->>Client: 1.5 Displays payment form
Client->>Frontend: 2.1 Enters the first 6 card numbers
Frontend->>MPjs: 2.2 getPaymentMethods(OPTIONS)
MPjs-->>Frontend: 2.3 paymentMethods
Frontend->>MPjs: 2.4 getIssuers(OPTIONS)
MPjs-->>Frontend: 2.5 issuers
Frontend->>Client: 2.6 Show available issuers
Frontend->>MPjs: 2.6 getInstallments(OPTIONS)
MPjs-->>Frontend: 2.7 installments
Frontend->>Client: 2.8 Show payment method and available installments
Client->>Frontend: 3.1 Submits the completed form
Frontend->>MPjs: 3.2 createCardToken(OPTIONS)
MPjs-->>Frontend: 3.3 cardToken
Frontend->>Backend: 3.4 POST/payment
Backend->>API: 3.5 POST /v1/payments
API-->>Backend: 3.6 Payment status
Backend-->>Frontend: 3.7 Payment status
Frontend->>Client: 3.8 Show result

To proceed with the setup of debit and/or credit card payments via \_Core Methods\_, follow the steps below. > NOTE > > Remember: before setting up the payment methods, choose the way you will process your transactions. The processing mode, whether \*\*manual or automatic\*\*, will be defined at the time of order creation, using the \`processing\_mode\` parameter. For more information, visit the section \[Integration model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model). :::AccordionComponent{title="Add payment form" pill="client-side"} The capture of card data (card number, security code and expiration date) is done through a payment form that allows obtaining and validating the information necessary to process the payment. To obtain this data and process payments, insert the \`HTML\` below directly into the project.

- [html ](#editor%5F3)
  html

```
<style>
  #form-checkout {
  display: flex;
  flex-direction: column;
  max-width: 600px;
  }
  .container {
  height: 18px;
  display: inline-block;
  border: 1px solid rgb(118, 118, 118);
  border-radius: 2px;
  padding: 1px 2px;
  }
  </style>
  <form id="form-checkout" action="/process_payment" method="POST">
  <div id="form-checkout__cardNumber" class="container"></div>
  <div id="form-checkout__expirationDate" class="container"></div>
  <div id="form-checkout__securityCode" class="container"></div>
  <input type="text" id="form-checkout__cardholderName" placeholder="Titular do cartão" />
  <select id="form-checkout__issuer" name="issuer">
  <option value="" disabled selected>Banco emissor</option>
  </select>
  <select id="form-checkout__installments" name="installments">
  <option value="" disabled selected>Parcelas</option>
  </select>
  <select id="form-checkout__identificationType" name="identificationType">
  <option value="" disabled selected>Tipo de documento</option>
  </select>
  <input type="text" id="form-checkout__identificationNumber" name="identificationNumber" placeholder="Número do documento" />
  <input type="email" id="form-checkout__email" name="email" placeholder="E-mail" />

  <input id="token" name="token" type="hidden">
  <input id="paymentMethodId" name="paymentMethodId" type="hidden">
  <input id="transactionAmount" name="transactionAmount" type="hidden" value="100">
  <input id="description" name="description" type="hidden" value="Nome do Produto">

  <button type="submit" id="form-checkout__submit">Pagar</button>
  </form>
```

Copiar

::: :::AccordionComponent{title="Initialize card fields" pill="client-side"} After adding the payment form, it is necessary to initialize the card fields (card number, expiration date and security code) that must be filled in when starting the payment flow. When finalizing the initialization of the fields, the <div> will contain the iframes with the inputs where the PCI data will be inserted.

- [javascript ](#editor%5F4)
  javascript

```
const cardNumberElement = mp.fields.create('cardNumber', {
  placeholder: "Número do cartão"
  }).mount('form-checkout__cardNumber');
  const expirationDateElement = mp.fields.create('expirationDate', {
  placeholder: "MM/YY",
  }).mount('form-checkout__expirationDate');
  const securityCodeElement = mp.fields.create('securityCode', {
  placeholder: "Código de segurança"
  }).mount('form-checkout__securityCode');
```

Copiar

::: :::AccordionComponent{title="Get document types" pill="client-side"} After configuring the credential, adding the payment form and initializing the card fields, it is necessary to obtain the types of documents that will be part of filling out the payment form. By including the element of type \`select\` with the id: \`form-checkout\_\_identificationType\` that is in the form, it will be possible to automatically fill in the available options when calling the function below.

- [javascript ](#editor%5F5)
  javascript

```
(async function getIdentificationTypes() {
  try {
  const identificationTypes = await mp.getIdentificationTypes();
  const identificationTypeElement = document.getElementById('form-checkout__identificationType');

  createSelectOptions(identificationTypeElement, identificationTypes);
  } catch (e) {
  return console.error('Error getting identificationTypes: ', e);
  }
  })();

  function createSelectOptions(elem, options, labelsAndKeys = { label: "name", value: "id" }) {
  const { label, value } = labelsAndKeys;

  elem.options.length = 0;

  const tempOptions = document.createDocumentFragment();

  options.forEach(option => {
  const optValue = option[value];
  const optLabel = option[label];

  const opt = document.createElement('option');
  opt.value = optValue;
  opt.textContent = optLabel;

  tempOptions.appendChild(opt);
  });

  elem.appendChild(tempOptions);
  }
```

Copiar

::: :::AccordionComponent{title="Get card payment methods" pill="client-side"} In this step, the buyers' data is validated when they fill in the necessary fields to make the payment. In order to identify the payment method used by the buyer, insert the code below directly into the project.

- [javascript ](#editor%5F6)
  javascript

```
const paymentMethodElement = document.getElementById('paymentMethodId');
  const issuerElement = document.getElementById('form-checkout__issuer');
  const installmentsElement = document.getElementById('form-checkout__installments');

  const issuerPlaceholder = "Banco emissor";
  const installmentsPlaceholder = "Parcelas";

  let currentBin;
  cardNumberElement.on('binChange', async (data) => {
  const { bin } = data;
  try {
  if (!bin && paymentMethodElement.value) {
  clearSelectsAndSetPlaceholders();
  paymentMethodElement.value = "";
  }

  if (bin && bin !== currentBin) {
  const { results } = await mp.getPaymentMethods({ bin });
  const paymentMethod = results[0];

  paymentMethodElement.value = paymentMethod.id;
  updatePCIFieldsSettings(paymentMethod);
  updateIssuer(paymentMethod, bin);
  updateInstallments(paymentMethod, bin);
  }

  currentBin = bin;
  } catch (e) {
  console.error('error getting payment methods: ', e)
  }
  });

  function clearSelectsAndSetPlaceholders() {
  clearHTMLSelectChildrenFrom(issuerElement);
  createSelectElementPlaceholder(issuerElement, issuerPlaceholder);

  clearHTMLSelectChildrenFrom(installmentsElement);
  createSelectElementPlaceholder(installmentsElement, installmentsPlaceholder);
  }

  function clearHTMLSelectChildrenFrom(element) {
  const currOptions = [...element.children];
  currOptions.forEach(child => child.remove());
  }

  function createSelectElementPlaceholder(element, placeholder) {
  const optionElement = document.createElement('option');
  optionElement.textContent = placeholder;
  optionElement.setAttribute('selected', "");
  optionElement.setAttribute('disabled', "");

  element.appendChild(optionElement);
  }

  // This step improves cardNumber and securityCode validations
  function updatePCIFieldsSettings(paymentMethod) {
  const { settings } = paymentMethod;

  const cardNumberSettings = settings[0].card_number;
  cardNumberElement.update({
  settings: cardNumberSettings
  });

  const securityCodeSettings = settings[0].security_code;
  securityCodeElement.update({
  settings: securityCodeSettings
  });
  }
```

Copiar

::: :::AccordionComponent{title="Get issuing bank" pill="client-side"} When filling out the payment form, it is possible to identify the card issuing bank, avoiding data processing conflicts between different issuers. In addition, it is from this identification that the installment options are displayed. The issuing bank is obtained through the \`issuer\_id\` parameter. To get it, use the Javascript below.

- [javascript ](#editor%5F7)
  javascript

```
async function updateIssuer(paymentMethod, bin) {
  const { additional_info_needed, issuer } = paymentMethod;
  let issuerOptions = [issuer];

  if (additional_info_needed.includes('issuer_id')) {
  issuerOptions = await getIssuers(paymentMethod, bin);
  }

  createSelectOptions(issuerElement, issuerOptions);
  }

  async function getIssuers(paymentMethod, bin) {
  try {
  const { id: paymentMethodId } = paymentMethod;
  return await mp.getIssuers({ paymentMethodId, bin });
  } catch (e) {
  console.error('error getting issuers: ', e)
  }
  };
```

Copiar

::: :::AccordionComponent{title="Get number of installments" pill="client-side"} One of the mandatory fields that make up the payment form is the \*\*number of installments\*\*. To activate it and display the available installments at the time of payment, use the function below.

- [javascript ](#editor%5F8)
  javascript

```
async function updateInstallments(paymentMethod, bin) {
  try {
  const installments = await mp.getInstallments({
  amount: document.getElementById('transactionAmount').value,
  bin,
  paymentTypeId: 'credit_card'
  });
  const installmentOptions = installments[0].payer_costs;
  const installmentOptionsKeys = { label: 'recommended_message', value: 'installments' };
  createSelectOptions(installmentsElement, installmentOptions, installmentOptionsKeys);
  } catch (error) {
  console.error('error getting installments: ', e)
  }
  }
```

Copiar

\> NOTE > > If you want to configure interest-free installments, please refer to the \[Support Center documentation\](https://www.mercadopago.com.ar/developers/es/support/cuotas-sin-interes\_3299). ::: :::AccordionComponent{title="Create card token" pill="client-side"} The card token is created from the card information itself, increasing security during the payment flow. In addition, once the token is used in a given purchase, it is discarded, requiring the creation of a new one for future purchases. To create the card token, use the function below. > NOTE > > Importante > > The \`createCardToken\` method returns a token with the secure representation of the card data. We will take the ID token from the response and save it in a hidden input called \`token\` and then send the form to the servers. In addition, remember that \*\*the token is valid for 7 days\*\* and can be \*\*used only once\*\*.

- [javascript ](#editor%5F9)
  javascript

```
const formElement = document.getElementById('form-checkout');
  formElement.addEventListener('submit', createCardToken);

  async function createCardToken(event) {
  try {
  const tokenElement = document.getElementById('token');
  if (!tokenElement.value) {
  event.preventDefault();
  const token = await mp.fields.createCardToken({
  cardholderName: document.getElementById('form-checkout__cardholderName').value,
  identificationType: document.getElementById('form-checkout__identificationType').value,
  identificationNumber: document.getElementById('form-checkout__identificationNumber').value,
  });
  tokenElement.value = token.id;
  formElement.requestSubmit();
  }
  } catch (e) {
  console.error('error creating card token: ', e)
  }
  }
```

Copiar

::: :::AccordionComponent{title="Submit payment" pill="server-side"} The payment submission must be made by creating an order that contains associated payment transactions. > NOTE > > The creation of a payment can occur asynchronously in an order. In this scenario, the order remains in a processing state and without information. We recommend setting up \[Order topic notifications\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/notifications) to receive updates on the status change, including the updated order data. Alternatively, you can choose to send a \*\*GET\*\* request to the :TagComponent{tag="API" text="/v1/orders/{id}" href="/developers/en/reference/online-payments/checkout-api/get-order/get"}endpoint to retrieve that updated information. To do this, send a \*\*POST\*\* with your :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."} and the required parameters listed below to the endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/en/reference/online-payments/checkout-api/create-order/post"} and execute the request. \`\`\`curl curl -X POST \\ 'https://api.mercadopago.com/v1/orders'\\ -H 'Content-Type: application/json' \\ -H 'X-Idempotency-Key: ' \\ -H 'Authorization: Bearer ' \\ -d '{ "type": "online", "processing\_mode": "automatic", "total\_amount": "50.00", "external\_reference": "ext\_ref\_1234", "payer": { "email": "{{EMAIL}}" }, "transactions": { "payments": \[ { "amount": "50.00", "payment\_method": { "id": "master", "type": "credit\_card", "token": "1223123", "installments": 1 } } \] } }' \`\`\` > NOTE > > Order creation is subject to request limits per client. If you receive a \`429 Too Many Requests\` error, wait the time indicated in the \`Retry-After\` response header before retrying. See \[Possible errors\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors) for more details. See the table below for descriptions of the parameters that are mandatory in the request and those that, although optional, have some important particularity that should be highlighted. | Parameter | Type | Description | Requirement | |---------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------| | \`Authorization\` | \_Header\_ | Refers to your private key, the :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."}. | Required | | \`X-Idempotency-Key\` | \_Header\_ | Idempotency key. It is used to ensure that each request is processed only once, avoiding duplications. Use a unique value in the header of your request, such as a UUID V4 or random strings. | Required | | \`processing\_mode\` | \_Body. String\_ | Processing mode of the order. The possible values are:

\- \`automatic\`: to create and process the order in automatic mode.

\- \`manual\`: to create the order and process it later.

For more information, visit the section \[Integration model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model). | Required | | \`total\_amount\` | \_Body. String\_ | Total amount for the transaction. | Optional | | \`transaction.payments.payment\_method.id\` | \_Body. String\_ | Payment method identifier. \*\*In this case, it is the brand of each card\*\*. You can check the complete list of available identifiers by sending a request to the \[Get payment methods\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/payment-methods/get) endpoint. | Required | | \`transaction.payments.payment\_method.type\` | \_Body. String\_ | Payment method type. For credit card payments, it should be \`credit\_card\`, and for debit card payments, it should be \`debit\_card\`. | Required | | \`transaction.payments.payment\_method.token\` | \_Body. String\_ | Card token. Required for credit and debit card payments. | Required | > SUCCESS\_MESSAGE > > To learn in detail about all the parameters sent and returned in this request, please refer to our \[API Reference\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/create-order/post). Additionally, if you receive an error when submitting the payment, you can consult our \[list of errors\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors). In case of success, the response will look like the example below. \`\`\`json { "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP", "type": "online", "processing\_mode": "automatic", "external\_reference": "ext\_ref\_1234", "total\_amount": "50.00", "total\_paid\_amount": "200.00", "country\_code": "BRA", "user\_id": "2021490138", "status": "processed", "status\_detail": "accredited", "capture\_mode": "automatic", "created\_date": "2025-04-17T21:41:33.96Z", "last\_updated\_date": "2025-04-17T21:41:35.144Z", "integration\_data": { "application\_id": "874202490252970" }, "transactions": { "payments": \[ { "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34", "amount": "50.00", "paid\_amount": "47.28", "reference\_id": "0002yjis6j", "status": "processed", "status\_detail": "accredited", "payment\_method": { "id": "master", "type": "credit\_card", "token": "519ada5ac7431ef6ce24ac19c38f6768", "installments": 1 } } \] } } \`\`\` Among the returned parameters, the ones indicated in the table below stand out. | Parameter | Type | Description | |---|---|---| | \`transactions.payments.status\` | \_String\_ | Transaction status. For example, \`processed\` indicates the payment was approved. See the \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) section for all possible values. | | \`transactions.payments.status\_detail\` | \_String\_ | Transaction status detail. For example, \`accredited\` indicates the payment was approved and credited. | | \`transactions.payments.paid\_amount\` | \_String\_ | Amount actually paid in the transaction. | > WARNING > > If you created the order manually, remember that processing the payment requires an additional step, which is the call to the Process order API. Additionally, this mode will allow you to reserve and capture funds. Refer to the \[Reserve, capture, and cancel funds\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/reserve-capture-cancel) section for more information. Once the order and payment are created, you can check the possible statuses by going to the \[Order status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/order-status) and \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) sections, respectively. ::: :::: ::::TabComponent{title="Core Methods (iOS)"} In the integration via \_Core Methods\_ for iOS applications, the developer is responsible for defining how to obtain the necessary information to complete the payment, including data about the document type and about the card (issuer and installments). ## Requirements Before starting the integration, make sure your project meets the following requirements: | Requirement | Description | |-|-| | iOS | Version 13 or higher | | XCode | Version 16 or higher | | Swift | Version 5.5 or higher | | Public Key | The :toolTipComponent\[Public Key\]{content="Public key used in the frontend to access information and encrypt data. You can access it through \*Your integrations > Integration data > Production > Production credentials\*."} is directly linked to the :toolTipComponent\[application\]{link="/developers/en/docs/checkout-api-orders/resources/application-details" linkText="Integration data" content="Entity registered in Mercado Pago that acts as an identifier to manage your integrations. For more information, see the link below."} you created, so each one is unique for each integration. | ## Configure secure fields Secure fields are components developed to ensure the privacy and protection of sensitive data entered by the buyer. Fully :toolTipComponent\[PCI-compliant\]{content="Set of security rules designed to protect payment card data against fraud and data breaches."}, these fields ensure that the application never has direct access to the entered information, which is securely transmitted only for the creation of tokens and transactions. All interactions with these fields occur through \_callbacks\_, allowing you to capture relevant events without exposing user data. The methods described below use instances of these secure fields, so it is essential that they are properly configured in the checkout interface before using them. Each component notifies the application whenever there is a value change, without exposing the entered data, and also informs the result of the field validation according to PCI and card rules. > NOTE > > The data entered in secure fields is never available to the integrating application. They are securely sent only for the creation of \_tokens\_ and transactions. See the table below for the available components. For more details about configuration, check the corresponding reference on GitHub. | Component Name | GitHub Reference | Description | |-------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------| | CardNumberTextField | \[Reference\](https://mercadopago.github.io/sdk-ios/0.1.0/documentation/coremethods/cardnumbertextfield) | Secure field to enter the card number. | | ExpirationDateTextField | \[Reference\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/expirationdatetextfield) | Secure field to enter the card expiration date. | | SecurityTextField | \[Reference\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield) | Secure field to enter the security code (CVV). | ## Core Methods \*\*Core Methods\*\* are essential for building a checkout flow integrated with Mercado Pago. They use information captured by the \[\*\*secure fields\*\*\](#bookmark\_secure\_fields) and enable the main payment operations. Each method should be used according to the needs of your payment flow. To use them, start by creating an instance of \_Core Methods\_ in your class with the following Swift code: \`private let coreMethods = CoreMethods()\`. This way, you will be able to use any of the methods listed below: :::AccordionComponent{title="Get payment methods" pill="client-side"} The \*\*Get payment methods\*\* method returns the list of available payment methods based on the informed card BIN, considering the rules and valid financial institutions for the configured country. This step is essential to identify the card brand, correctly set up the next steps in the checkout, and validate card acceptance. \`\`\`swift Task { // Whether to use the bin returned from OnBinChanged of the CardNumberTextfield let paymentMethod = try await coreMethods.paymentMethods( bin: "5024111" ) } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | |-----------|--------|------------------------------------------------------------------------------------------------------------|----------| | bin | String | The first 8 digits of the credit card, obtained by the \`onBinChange\` callback from \`CardNumberTextField\`. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/paymentmethods(bin:mode:)). ::: :::AccordionComponent{title="Get installment options" pill="client-side"} The \*\*Get installment options\*\* method searches for all available installment plans for a given card and transaction amount. It considers the issuer’s rules, the payment method, and the purchase amount, returning all valid installment options, including number of installments, interest, value of each installment, total value, among others. The call to the \`getInstallments\` method must be made for all card types (debit and credit) to verify if the payment can be completed using that method. See the usage example below: \`\`\`swift Task { // You should use the bin returned from OnBinChanged of CardNumberTextfield let installments = try await coreMethods.installments( bin: "12345678", amount: "100" ) } \`\`\` > NOTE > > Use the information from the \`Installment\` to display to the buyer all details of the value and installment plan of the purchase before completing the payment. The parameters are listed in the table below. | Parameter | Type | Description | Required | | - | - | - | - | | \`bin\` | String | 8 digits of the credit card. | Required | | \`amount\` | Long | Order amount. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/paymentmethods(bin:mode:)). ::: :::AccordionComponent{title="Get card issuer" pill="client-side"} For certain payment methods and brands, Mercado Pago requires the identification of the card issuer (\_issuer\_). This method returns the list of available card issuers for the informed BIN, allowing the user to select the appropriate issuer when necessary. \`\`\`swift Task { // You should use the bin returned from OnBinChanged of CardNumberTextfield // You should use the paymentMethodId returned from the PaymentMethods request let issuer = try await coreMethods.issuers( bin: 12345678, paymentMethodID: paymentMethodId ) } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | |-------------------|---------|------------------------------------------------------------------------------------------------------------|----------| | bin | String | The first 8 digits of the credit card, obtained by the \`onBinChange\` callback from \`CardNumberTextField\`. | Required | | paymentMethodId | String | Payment method ID, obtained in the result of the \`PaymentMethods\` method. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/issuers(bin:paymentmethodid:)). ::: :::AccordionComponent{title="Get document types" pill="client-side"} Mercado Pago requires the validation of a cardholder's document. This method returns all accepted document types, such as CPF, RG, DNI, for the selected country. \`\`\`swift Task { let documents = await self.coreMethods.identificationTypes() } \`\`\` For more information about the call response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/identificationtypes()). ::: :::AccordionComponent{title="Create card token" pill="client-side"} This method is responsible for generating a temporary \_token\_ from the informed card data. The generated \_token\_ is required to carry out the payment transaction via the Mercado Pago API, as it replaces the card's sensitive data, ensuring greater security in the process. > WARNING > > The call to this method uses an instance of the \[secure fields\](#bookmark\_secure\_fields) previously configured in the checkout interface. Therefore, make sure that the secure fields are properly implemented and configured before using the \`generateCardToken\` method. ### Create a \_token\_ for a new card To securely generate a \_token\_ for a new card, use the class that protects the entered data and pass it to the \`generateCardToken\` method. Before executing the method, check that all required fields are filled in correctly. \`\`\`swift Task { let token = try await coreMethods.createToken( cardNumber: cardNumber, expirationDate: expirationDate, securityCode: securityCode, documentType: IdentificationType(name: "CPF"), documentNumber: "1234567891", cardHolderName: "APRO" ) print("Token response => \\(response.token)") } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | | - | - | - | - | | \`cardNumberState\` | \[CardNumberTextField\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/cardnumbertextfield) | Card number field class. | Required | | \`expirationDateState\` | \[ExpirationDateTextfield\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/expirationdatetextfield) | Card expiration date field class. | Required | | \`securityCodeState\` | \[SecurityCodeTextField\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield) | Card security code field class. | Required | | \`documentType\` | \[IdentificationType\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/identificationtype) | Type of document being sent | Optional | | \`documentNumber\` | String | Document number | Optional | | \`cardHolderName\` | String | Full name of the cardholder | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/createtoken(cardnumber:expirationdate:securitycode:documenttype:documentnumber:cardholdername:)). ### Create a \_token\_ for an existing card In the Mercado Pago flow, data from cards previously registered by the buyer is securely stored and is not accessible to your \_backend\_. Only the card \`ID\` is available to the application. To process payments with saved cards, use this \`ID\` to generate a temporary \_token\_. This process ensures the protection of sensitive information, as only the card \`ID\` is handled by the application, while the card number, CVV, and expiration date are never exposed. Make sure that the secure fields are correctly configured and filled in. \`\`\`swift func generateTokenByCardID() { Task { let response = try await coreMethods.createToken( cardID: "123", securityCode: securityCodeField ) print("Token response => \\(response.token)") } } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | | - | - | - | - | | \`cardID\` | String | Generated existing card ID. | Required | | \`securityCode\` | \[SecurityCodeTextField\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield) | Card security code field class. | Optional | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/createtoken(cardid:expirationdate:securitycode:)). ::: :::AccordionComponent{title="Make a payment" pill="server-side"} Payment submission must be done by creating an order that contains the associated payment transaction. For this, send a \*\*POST\*\* with your :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."} and the required parameters listed below to the endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/en/reference/online-payments/checkout-api/create-order/post"} and execute the request. \`\`\`curl curl -X POST \\ 'https://api.mercadopago.com/v1/orders'\\ -H 'Content-Type: application/json' \\ -H 'X-Idempotency-Key: ' \\ -H 'Authorization: Bearer ' \\ -d '{ "type": "online", "processing\_mode": "automatic", "total\_amount": "50.00", "external\_reference": "ext\_ref\_1234", "payer": { "email": "test@testuser.com" }, "transactions": { "payments": \[ { "amount": "50.00", "payment\_method": { "id": "master", "type": "credit\_card", "token": "1223123", "installments": 1 } } \] } }' \`\`\` See the table below for parameter descriptions. | Parameter | Type | Description | Required/Optional | |---|---|---|---| | \`Authorization\` | \_Header\_ | Refers to your private key, the :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."}. | Required | | \`X-Idempotency-Key\` | \_Header\_ | Idempotency key. This key ensures that each request is processed only once, preventing duplicates. Use a unique value in the request \`header\`, such as a UUID V4 or a random \_string\_. | Required | | \`processing\_mode\` | \_Body. String\_ | Order processing mode. Possible values are:

\- \`automatic\`: to create and process the order automatically.

\- \`manual\`: to create the order and process it later.

For more information, see the \[Integration Model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model) section. | Required | | \`total\_amount\` | \_Body. String\_ | Total transaction amount. | Required | | \`transaction.payments.payment\_method.id\` | \_Body. String\_ | Payment method identifier. \*\*In this case, it is the brand of each card\*\*. You can check the complete list of available identifiers by sending a request to the endpoint \[Get payment methods\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/payment-methods/get). | Required | | \`transaction.payments.payment\_method.type\` | \_Body. String\_ | Payment method type. For credit card payments, it must be \`credit\_card\`, and for debit card payments, it must be \`debit\_card\`. | Required | | \`transaction.payments.payment\_method.token\` | \_Body. String\_ | Card token. Required for credit and debit card payments. | Required | > SUCCESS\_MESSAGE > > To know all the parameters sent in this request in detail, see our \[API Reference\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/create-order/post). If you receive an error when sending the payment, check our \[error list\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors). If successful, the response will be similar to the following example. \`\`\`json { "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP", "type": "online", "processing\_mode": "automatic", "external\_reference": "ext\_ref\_1234", "total\_amount": "50.00", "total\_paid\_amount": "200.00", "country\_code": "BRA", "user\_id": "2021490138", "status": "processed", "status\_detail": "accredited", "capture\_mode": "automatic", "created\_date": "2025-04-17T21:41:33.96Z", "last\_updated\_date": "2025-04-17T21:41:35.144Z", "integration\_data": { "application\_id": "874202490252970" }, "transactions": { "payments": \[ { "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34", "amount": "50.00", "paid\_amount": "47.28", "reference\_id": "0002yjis6j", "status": "processed", "status\_detail": "accredited", "payment\_method": { "id": "master", "type": "credit\_card", "token": "519ada5ac7431ef6ce24ac19c38f6768", "installments": 1 } } \] } } \`\`\` Among the returned parameters, the ones indicated in the table below stand out. | Parameter | Type | Description | |---|---|---| | \`transactions.payments.status\` | \_String\_ | Transaction status. For example, \`processed\` indicates the payment was approved. See the \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) section for all possible values. | | \`transactions.payments.status\_detail\` | \_String\_ | Transaction status detail. For example, \`accredited\` indicates the payment was approved and credited. | | \`transactions.payments.paid\_amount\` | \_String\_ | Amount actually paid in the transaction. | > WARNING > > If you have created the order in manual mode, the payment will require an additional call to :TagComponent{tag="API" text="Process order" href="/developers/en/reference/online-payments/checkout-api/process-order/post"}. It is also possible to reserve and capture amounts. For more details, see the \[Reserve, capture and cancel amounts documentation\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/reserve-capture-cancel). Once the order and payment have been created, you can check the possible statuses in the sections \[Order status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/order-status) and \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status), respectively. ::: ## Examples and references To deepen your understanding of the implementation and use of the SDK, check the \[GitHub repository\](https://github.com/mercadopago/sdk-ios). The repository includes a complete example module, demonstrating the integration of secure fields and \_Core Methods\_, as well as presenting an integrated and secure checkout flow. :::: ::::TabComponent{title="Core Methods (Android)"} In the integration via \_Core Methods\_ for Android applications, the developer is responsible for defining how to obtain the necessary information to complete the payment, including data about the document type and about the card (issuer and installments). ## Requirements Before you start the integration, make sure your project meets the following requirements: | Requirement | Description | |-|-| | SDK | Version 23 or higher | | Jetpack Compose BoM | Version 2024.12.01 or higher | | Kotlin | Version 2.0 or higher | | Public Key | The :toolTipComponent\[Public Key\]{content="Public key used in the frontend to access information and encrypt data. You can access it through \*Your integrations > Integration data > Production > Production credentials\*."} is directly linked to the :toolTipComponent\[application\]{link="/developers/en/docs/checkout-api-orders/resources/application-details" linkText="Integration data" content="Entity registered in Mercado Pago that acts as an identifier to manage your integrations. For more information, see the link below."} you created, so each one is unique for every integration. | ## Configure secure fields Secure fields are components developed to ensure the privacy and protection of sensitive data typed by the buyer. Fully :toolTipComponent\[PCI-compliant\]{content="Set of security rules designed to protect payment card data against fraud and data breaches."}, these fields ensure that the application never has direct access to the entered information, which is securely transmitted only for the creation of tokens and transactions. All interactions with these fields occur through \_callbacks\_, allowing the capture of relevant events without exposing user data. The methods described below use instances of these secure fields, so it is essential that they are properly configured in the checkout interface before using them. Each component notifies the integrating application when there is a value change, without exposing the entered data, and also informs the result of the field validation according to PCI and card rules. > NOTE > > The data typed in the secure fields is never available to the integrating application. They are securely sent only for the creation of \_tokens\_ and transactions. In the table below, you will find the details of the available components. For more information about configuration, refer to the corresponding documentation for each component on GitHub. | Component name | GitHub Reference | Description | |------------------------|--------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------| | CardNumberTextField | \[Reference\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.cardnumber/index.html) | Secure field to enter the card number. | | ExpirationDateTextField| \[Reference\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.expirationdate/index.html) | Secure field to enter the card expiration date. | | SecurityTextField | \[Reference\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.securitycode/index.html) | Secure field to enter the security code (CVV). | ## Core Methods \*\*Core Methods\*\* are essential for building a checkout flow integrated with Mercado Pago. They use information captured by the \[\*\*secure fields\*\*\](#bookmark\_secure\_fields) and enable the execution of the main payment operations. Each method should be used according to the needs of your payment flow. To use them, start by creating an instance of \_Core Methods\_ in your class with the following Kotlin code: \`val coreMethods = MercadoPagoSDK.getInstance().coreMethods\`. This way, you will be able to use any of the methods listed below: :::AccordionComponent{title="Get payment methods" pill="client-side"} The \*\*Get payment methods\*\* method returns the list of available payment methods based on the informed card BIN, considering the rules and valid financial institutions for the configured country. This step is essential to identify the card brand, correctly set the next steps of the checkout, and validate the card acceptance. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { // You should use the bin returned from CardNumberTextFieldEvent.OnBinChanged val result = coreMethods.getPaymentMethods(bin = bin) when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | |-----------|--------|------------------------------------------------------------------------------------------------------------|------------| | bin | String | The first 8 digits of the credit card, obtained by the \`onBinChange\` callback of \`CardNumberTextFieldEvent\`. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-payment-methods.html). ::: :::AccordionComponent{title="Get installment options" pill="client-side"} The \*\*Get installment options\*\* method searches for all available installment options for a given card and transaction amount. It considers the issuer’s rules, the payment method, and the purchase amount, returning all valid installment options, including number of installments, interest, value of each installment, total value, and more. The call to the \`getInstallments\` method must be made for all card types (debit and credit) to verify if the payment can be completed using that method. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { // You should use the bin returned from CardNumberTextFieldEvent.OnBinChanged val result = coreMethods.getInstallments( bin = bin, amount = BigDecimal("100.00") ) when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` > NOTE > > Use the information from the \`Installment\` to show the buyer all details of the purchase value and installment plan before completing the payment. The parameters are listed in the table below. | Parameter | Type | Description | Required | |----------------|------------------|------------------------------------------------------------------------------------------------------------|------------| | bin | String | The first 8 digits of the credit card, obtained by the \`onBinChange\` callback of \`CardNumberTextFieldEvent\`. | Required | | amount | Long | Total transaction amount. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-installments.html). ::: :::AccordionComponent{title="Get card issuer" pill="client-side"} For certain payment methods and brands, Mercado Pago requires the identification of the card issuer (\_issuer\_). This method returns the list of available issuers for the informed BIN, allowing the user to select the correct issuer when necessary. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { // You should use the bin returned from CardNumberTextFieldEvent.OnBinChanged // You should use the paymentMethodId returned from the PaymentMethods request val result = coreMethods.getCardIssuers( bin = bin, paymentMethodId = paymentMethodId, ) when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | |-----------------|--------|---------------------------------------------------------------------------------------------------------------|------------| | bin | String | The first 8 digits of the credit card, obtained by the \`onBinChange\` callback of \`CardNumberTextFieldEvent\`. | Required | | paymentMethodId | String | Payment method ID, usually obtained from the result of the \`PaymentMethods\` method. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-card-issuers.html). ::: :::AccordionComponent{title="Get document types" pill="client-side"} In some countries, Mercado Pago requires the validation of an identification document of the cardholder. This method returns all accepted document types, such as CPF, RG, DNI, for the country configured in the integration. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { val result = coreMethods.getIdentificationTypes() when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-identification-types.html). ::: :::AccordionComponent{title="Create card token" pill="client-side"} This method is responsible for generating a temporary \_token\_ from the informed card data. The generated \_token\_ is required for the payment transaction via the Mercado Pago API, as it replaces the card’s sensitive data, ensuring greater security in the process. > WARNING > > The call to this method uses an instance of the \[secure fields\](#bookmark\_secure\_fields) previously configured in the checkout interface. Therefore, make sure the secure fields are properly implemented and configured before using the \`generateCardToken\` method. ### Create a \_token\_ for a new card To securely generate a \_token\_ for a new card, use the class that protects the entered data and pass it to the \`generateCardToken\` method. Before executing the method, check if all required fields are correctly filled. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { val result = coreMethods.generateCardToken( cardNumberState = cardNumberPCIFieldState, expirationDateState = expirationDatePCIFieldState, securityCodeState = securityCodePCIFieldState, buyerIdentification = BuyerIdentification( name = "APRO", number = "12345678909", type = "CPF" ) ) when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | | - | - | - | - | | \`cardNumberState\` | \[PCIFieldState\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Card number field state. | Required | | \`expirationDateState\` | \[PCIFieldState\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Card expiration field state. | Required | | \`securityCodeState\` | \[PCIFieldState\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Card security code field state. | Required | | \`buyerIdentification\` | \[BuyerIdentification\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.model/-buyer-identification/index.html?query=data%20class%20BuyerIdentification(val%20name:%20String?,%20val%20number:%20String?,%20val%20type:%20String?)) | Buyer identification class. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/generate-card-token.html). ### Create a \_token\_ for an existing card In the Mercado Pago flow, card data previously registered by the buyer is securely stored and not accessible to your \_backend\_. Only the card \`ID\` is available to the application. To process payments with saved cards, use this \`ID\` to generate a temporary \_token\_. This process ensures the protection of sensitive information, as only the card \`ID\` is handled by the application, while the card number, CVV, and expiration date are never exposed. Make sure the secure fields are properly configured and filled in. \`\`\`kotlin val coreMethods = MercadoPagoSDK.getInstance().coreMethods coroutineScope { val result = coreMethods.generateCardToken( cardId = cardId, expirationDateState = expirationDatePCIFieldState, securityCodeState = securityCodePCIFieldState, buyerIdentification = BuyerIdentification( name = "APRO", number = "12345678909", type = "CPF" ) ) when (result) { is Result.Success -> { // Request succeeded print("Request success: ${result.data}") } is Result.Error -> { when (result.error) { is ResultError.Request -> { // Request-type error print("Request error: ${result.error}") } is ResultError.Validation -> { // Validation-type error print("Validation error: ${result.error}") } } } } } \`\`\` The parameters are listed in the table below. | Parameter | Type | Description | Required | | - | - | - | - | | \`cardId\` | String | Generated existing card ID. | Required | | \`securityCodeState\` | \[PCIFieldState\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Card security code field state. | Required | | \`expirationDateState\` | \[PCIFieldState\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Card expiration field state. | Optional | | \`buyerIdentification\` | \[BuyerIdentification\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.model/-buyer-identification/index.html?query=data%20class%20BuyerIdentification(val%20name:%20String?,%20val%20number:%20String?,%20val%20type:%20String?)) | Buyer identification class. | Required | For more information about the response, check the \[method documentation on GitHub\](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/generate-card-token.html). ::: :::AccordionComponent{title="Make a payment" pill="server-side"} Payment submission must be done by creating an order that contains the associated payment transaction. For this, send a \*\*POST\*\* with your :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."} and the required parameters listed below to the endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/en/reference/online-payments/checkout-api/create-order/post"} and execute the request. \`\`\`curl curl -X POST \\ 'https://api.mercadopago.com/v1/orders'\\ -H 'Content-Type: application/json' \\ -H 'X-Idempotency-Key: ' \\ -H 'Authorization: Bearer ' \\ -d '{ "type": "online", "processing\_mode": "automatic", "total\_amount": "50.00", "external\_reference": "ext\_ref\_1234", "payer": { "email": "test@testuser.com" }, "transactions": { "payments": \[ { "amount": "50.00", "payment\_method": { "id": "master", "type": "credit\_card", "token": "1223123", "installments": 1 } } \] } }' \`\`\` See the table below for descriptions of the parameters that have any important particularity to highlight. | Parameter | Type | Description | Required/Optional | |---|---|---|---| | \`Authorization\` | \_Header\_ | Refers to your private key, the :toolTipComponent\[test Access Token\]{content="Private key of the application created in Mercado Pago, that must be used in the backend. You can access it through \*Your integrations > Integration data > Tests > Test credentials\*. The test Access Token starts with the prefix \`APP\_USR\`."}. | Required | | \`X-Idempotency-Key\` | \_Header\_ | Idempotency key. This key ensures that each request is processed only once, preventing duplicates. Use a unique value in the request \`header\`, such as a UUID V4 or a random \_string\_. | Required | | \`processing\_mode\` | \_Body. String\_ | Order processing mode. Possible values are:

\- \`automatic\`: to create and process the order automatically.

\- \`manual\`: to create the order and process it later.

For more information, see the \[Integration Model\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-model) section. | Required | | \`total\_amount\` | \_Body. String\_ | Total transaction amount. | Required | | \`transaction.payments.payment\_method.id\` | \_Body. String\_ | Payment method identifier. \*\*In this case, it is the brand of each card\*\*. You can check the complete list of available identifiers by sending a request to the endpoint \[Get payment methods\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/payment-methods/get). | Required | | \`transaction.payments.payment\_method.type\` | \_Body. String\_ | Payment method type. For credit card payments, it must be \`credit\_card\`, and for debit card payments, it must be \`debit\_card\`. | Required | | \`transaction.payments.payment\_method.token\` | \_Body. String\_ | Card token. Required for credit and debit card payments. | Required | > SUCCESS\_MESSAGE > > To know all the parameters sent in this request in detail, see our \[API Reference\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/create-order/post). If you receive an error when sending the payment, check our \[error list\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/integration-errors). If successful, the response will be similar to the following example. \`\`\`json { "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP", "type": "online", "processing\_mode": "automatic", "external\_reference": "ext\_ref\_1234", "total\_amount": "50.00", "total\_paid\_amount": "200.00", "country\_code": "BRA", "user\_id": "2021490138", "status": "processed", "status\_detail": "accredited", "capture\_mode": "automatic", "created\_date": "2025-04-17T21:41:33.96Z", "last\_updated\_date": "2025-04-17T21:41:35.144Z", "integration\_data": { "application\_id": "874202490252970" }, "transactions": { "payments": \[ { "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34", "amount": "50.00", "paid\_amount": "47.28", "reference\_id": "0002yjis6j", "status": "processed", "status\_detail": "accredited", "payment\_method": { "id": "master", "type": "credit\_card", "token": "519ada5ac7431ef6ce24ac19c38f6768", "installments": 1 } } \] } } \`\`\` Among the returned parameters, the ones indicated in the table below stand out. | Parameter | Type | Description | |---|---|---| | \`transactions.payments.status\` | \_String\_ | Transaction status. For example, \`processed\` indicates the payment was approved. See the \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status) section for all possible values. | | \`transactions.payments.status\_detail\` | \_String\_ | Transaction status detail. For example, \`accredited\` indicates the payment was approved and credited. | | \`transactions.payments.paid\_amount\` | \_String\_ | Amount actually paid in the transaction. | > WARNING > > If you have created the order in manual mode, the payment will require an additional call to :TagComponent{tag="API" text="Process order" href="/developers/en/reference/online-payments/checkout-api/process-order/post"}. It is also possible to reserve and capture amounts. For more details, see the \[Reserve, capture and cancel amounts documentation\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/reserve-capture-cancel). Once the order and payment have been created, you can check the possible statuses in the sections \[Order status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/order-status) and \[Transaction status\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status), respectively. ::: ## Examples and references To deepen your understanding of the implementation and use of the SDK, check the \[GitHub repository\](https://github.com/mercadopago/sdk-android). The repository includes a complete example module, demonstrating the integration of secure fields and \_Core Methods\_, as well as presenting an integrated and secure checkout flow. :::: :::::
