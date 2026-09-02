# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/resources/reports/account-money/report-fields.md

\# Glossary If you have any doubts about the technical terms used, check the glossary below. | Name on the report column | What it means | Data type  
(maximum longitude) | |---|---|---| | Reference code (\`EXTERNAL\_REFERENCE\`) | ID that helps identify the origin of the transaction. For example, it can be the sale through the order ID or the shipment (if it is a cart purchase) or the ID itself provided by the seller in case of an external integration.

Please note that this field might be empty in some cases such as the invoice payment, money transfer etc.  
| String  
(255) | | Mercado Pago transaction ID (\`SOURCE\_ID\`) | Transaction ID in Mercado Pago (e.g an order payment). | String  
(100) | | Seller account code (\`USER\_ID\`) | Seller account code. (Cust ID). | String  
(19) | | Payment method (\`PAYMENT\_METHOD\`) | Check the \[available payment methods\](https://www.mercadopago.com.ar/developers/en/docs/sales-processing/payment-methods) according to the country you operate with Mercado Pago. | String  
(50) | | Payment method type (\`PAYMENT\_METHOD\_TYPE\`) | Payment method type. It can be:

\*credit\_card\*: credit card.  
\*debit\_card\*: debit card.  
\*bank\_transfer\*: transfer.  
\*atm\*: ATM.  
\*ticket\*: cash.  
\*account\_money\*: account money.  
\*prepaid\_card\*: prepaid card.  
| String  
(200) | | Country of origin of the Mercado Pago account (\`SITE\`) | MLA: Argentina | String  
(200) | | Transaction type (\`TRANSACTION\_TYPE\`) | Transaction type. It can be:

Approved payment (\*SETTLEMENT\*): payment approved.  
Money refund (\*REFUND\*): partial or total refund.  
Chargeback (\*CHARGEBACK\*): the buyer has a chargeback (did not recognize the payment) in their credit card.  
Complaint (\*DISPUTE\*): the buyer initiated a complaint for this payment.  
Bank account transfer (\*WITHDRAWAL\*): transfer to a bank account.  
Cancelled bank account transfer (\*WITHDRAWAL\_CANCEL\*): cancel of a transfer to a bank account.  
Cash withdrawal (\*PAYOUT\*): cash withdrawal from the money available in Mercado Pago. | String  
(200) | | Purchase amount (\`TRANSACTION\_AMOUNT\`) | Transaction net amount. | Numeric  
(17,2) | | Currency (\`TRANSACTION\_CURRENCY\`) | Can assume some of these values as appropriate:

MXN (Peso Mexicano)  
CLP (Peso Chileno)  
ARS (Peso Argentino)  
BRL (Real Brasileiro)  
COP (Peso Colombiano)  
PEN (Sol Peruano)  
UYU (Peso Uruguayo)  
VES (Bolivar Venezolano)  
USD (Dollar) | String  
(10) | | Amount received for split purchases (\`SELLER\_AMOUNT\`) | Amount received for split purchases. | Numeric  
(17,2) | | Date of origin (\`TRANSACTION\_DATE\`) | Transaction creation date. | Numeric  
(17) | | Fees + VAT (\`FEE\_AMOUNT\`) | Sum of the processing, shipping, installments and coupon fees if it was at seller's expense. Includes VAT. | Numeric  
(17,2) | | Net amount of the transaction that impacted your balance (\`SETTLEMENT\_NET\_AMOUNT\`) | Net amount of the transaction that impacted the balance. All fees involved were deducted from the purchase amount \`TRANSACTION\_AMOUNT\`. | Numeric  
(17,2) | | Settlement currency (\`SETTLEMENT\_CURRENCY\`) | Can assume some of these values as appropriate:

MXN (Peso Mexicano)  
CLP (Peso Chileno)  
ARS (Peso Argentino)  
BRL (Real Brasileiro)  
COP (Peso Colombiano)  
PEN (Sol Peruano)  
UYU (Peso Uruguayo)  
VES (Bolivar Venezolano)  
USD (Dollar) | String  
(10) | | Approval date (\`SETTLEMENT\_DATE\`) | Transaction approval date. | DateTime  
(yyyy-MM-dd'T'HH:mm:ssZ) | | Transaction net amount (\`REAL\_AMOUNT\`) | Net amount of the transaction, if it is a approved payment (settlement), the amounts regarding chargebacks, complaints or returns are discounted. | Numeric  
(17,2) | | Discount coupon (\`COUPON\_AMOUNT\`) | Amount of the discount coupon. \*\*It is only deducted from gross amount or purchase amount\*\* (\`TRANSACTION\_AMOUNT\`) \*\*if provided by the seller.\*\* | Numeric  
(17,2) | | Additional details (\`METADATA\`) | Additional details such as the ID of the partial refunds or details provided by the seller in case they have an external integration. | String  
(JSON) | | Mercado Libre feed + VAT (\`MKP\_FEE\_AMOUNT\`) | Mercado Libre Fee. Includes VAT. | Numeric  
(17,2) | | Fee for offering interest-free installments (\`FINANCING\_FEE\_AMOUNT\`) | Fee for offering interest-free installments. | Numeric  
(17,2) | | Shipping cost (\`SHIPPING\_FEE\_AMOUNT\`) | Shipping cost. | Numeric  
(17,2) | | Taxes collected for IIBB withholdings (\`TAXES\_AMOUNT\`) | Tax collected for withholdings of Gross Income, VAT, Profits; and taxes on Credits and Debits, among others. \[Check further details about withholdings.\](https://vendedores.mercadolibre.com.ar/nota/retenciones-y-percepciones-sobre-tus-ventas-lo-que-debes-saber/) | Numeric  
(17,2) | | Installments (\`INSTALLMENTS\`) | Number of installments in which the transaction was carried out. | Numeric  
(2) | | Tax details (\`TAX\_DETAIL\`) | Description of the tax withheld for transaction in the taxes collected by IIBB withholdings \`TAXES\_AMOUNT\`.

It can assume the following values according to the jurisdiction:  
cordoba  
corrientes  
mendoza  
la\_pampa  
santa\_fe  
tucuman  
entre\_rios  
catamarca  
neuquen  
santiago\_del\_estero  
rio\_negro  
jujuy | String  
(50) | | Cashier ID (\`POS\_ID\`) | Cashier ID if the payment is made at a physical store. | String  
(50) | | Cashier name (\`POS\_NAME\`) | Name of the cashier for the payment made at a physical store. | String  
(200) | | Cashier ID defined by the user (\`EXTERNAL\_POS\_ID\`) | Cashier ID defined by the user for the payment made at a physical store. | String  
(100) | | Store ID (\`STORE\_ID\`) | Store ID if the payment is made at a physical store. | String  
(50) | | Store name (\`STORE\_NAME\`) | Store name if the payment is made at a physical store. | String  
(200) | | Store ID defined by the user (\`EXTERNAL\_STORE\_ID\`) | Store ID defined by the user for the payment made at a physical store. | String  
(100) | | Order ID (\`ORDER\_ID\`) | Purchase Order. | Numeric  
(19) | | Shipping ID (\`SHIPPING\_ID\`) | Shipping Identification. | Numeric  
(19) | | Shipping method (\`SHIPMENT\_MODE\`) | Shipping Method. | String  
(10) | | Package ID (\`PACK\_ID\`) | Package ID in the cart. | Numeric  
(19) | | Detailed taxes (\`TAXES\_DISAGGREGATED\`) | Detailed taxes in the JSON format. | String  
(255) | | POS machine series number (S/N) (\`POI\_ID\`) | POS machine ID if the payment is made at a physical store. | String  
(50) | | Digital Wallet (\`POI\_WALLET\_NAME\`) | Name of the digital wallet from which a digital payment is originated. It allows to identify the origin of a transaction when the payment is made with a \[interoperable QR code\](https://vendedores.mercadolibre.com.ar/nota/cobra-a-otras-billeteras-con-tu-qr-de-mercado-pago). | String  
(200) | | Bank of origin (\`POI\_BANK\_NAME\`) | Name of the bank institution from which a digital payment is originated. It allows to identify the origin of a transaction when the payment is made with a \[interoperable QR code\](https://vendedores.mercadolibre.com.ar/nota/cobra-a-otras-billeteras-con-tu-qr-de-mercado-pago). | String  
(200) | | Description (\`DESCRIPTION\`) | It helps identify the register of the transactions or operations in a period of time.  
When its a payment in installments, it will be "INSTALLMENT". | String  
(50) | | Money release date (\`MONEY\_RELEASE\_DATE\`) | Date in which each installment payment will be realeased. | DateTime  
(yyyy-MM-dd'T'HH:mm:ssZ) | | Released (\`IS\_RELEASED\`) | Indicates if the money from the operation has already been released. It can take the values TRUE (money released) or FALSE (money not released). | Boolean  
(TRUE/FALSE) | | Buyer card (\`CARD\_INITIAL\_NUMBER\`) | Corresponds to the first digits of the credit or debit card used in a purchase. | Numeric  
(8) | | Transaction labels (\`OPERATION\_TAGS\`) | These are labels used to categorize and/or segment different aspects of the transaction, such as the channels used to make a payment. They are identified as:  
Payment via WhatsApp (WHATSAPP\_PAY): this label indicates that the payment was made through WhatsApp. | String  
(JSON) | | Payer name (\`PAYER\_NAME\`) | Name of the person who makes a payment or a donation. This information can only be used for reconciliation purposes, will be treated according to the applicable personal data protection laws and will be available when payments via QR code or transfers are received, as well as when a donation is received by an NGO. | String  
(255) | | Payer ID type (\`PAYER\_ID\_TYPE\`) | Type of identification of the person who makes a payment or a donation. This information can only be used for reconciliation purposes, will be treated according to the applicable personal data protection laws and will be available when payments via QR code or transfers are received, as well as when a donation is received by an NGO. | String  
(200) | | Payer ID number (\`PAYER\_ID\_NUMBER\`) | Identification number of the person who makes a payment or a donation. This information can only be used for reconciliation purposes, will be treated according to the applicable personal data protection laws and will be available when payments via QR code or transfers are received, as well as when a donation is received by an NGO. | String  
(100) | | Sales channel (\`BUSINESS\_UNIT\`) | Corresponds to the channel through which an order was generated. The channels are Mercado Pago, Mercado Libre, Mercado Shops and Delivery. | String  
(255) | | Payment platform (\`SUB\_UNIT\`) | It allows to identify the method used to collect a payment with Mercado Pago. | String  
(255) | | Product SKU Code (\`PRODUCT\_SKU\`) | SKU code with which you will be able to identify your sold products. | String  
(200) | | Sale detail (\`SALE\_DETAIL\`) | This column offers detailed information on the items sold in each delivery, making it easier to reconcile and control your sales. | String  
(200) | | Tip amount (\`TIP\_AMOUNT\`) | Tip amount received in the transaction. | Numeric  
(17,2) | | Card brand (\`FRANCHISE\`) | Name of the used card brand. | Alphanumeric string | | Last 4 digits (\`LAST\_FOUR\_DIGITS\`) | Last 4 digits of the card used. | Numeric, integer | | Request ID (\`ORDER\_MP\`) | Order identifier in Mercado Pago. | Alphanumeric string | | Transaction attempt ID (\`TRANSACTION\_INTENT\_ID\`) | Transaction intent identifier. | Alphanumeric string | | Billing period (\`INVOICING\_PERIOD\`) | Billing period to which the transaction corresponds. Helps organize and reconcile transactions by billing cycle. | Numeric, integer | | Issuer name (\`ISSUER\_NAME\`) | Name of the financial institution that issued the card or payment method used in the transaction. | Alphanumeric string | | Payment bank account number (\`PAY\_BANK\_TRANSFER\_ID\`) | Unique identifier assigned to each bank transfer used as a payment method. Allows tracking and managing the details of that specific transaction. | Alphanumeric string | | Purchase ID (\`PURCHASE\_ID\`) | Unique identifier assigned to a specific purchase or transaction. | Alphanumeric string | | Shipping association ID (\`SHIPPING\_ORDER\_ID\`) | Unique internal identifier to track each shipping order within the company. Allows managing the details of each request. It is not the carrier's tracking number. | Alphanumeric string | | Application ID (\`APPLICATION\_ID\`) | Internal MP application identifier; identifies which specific application generated each transaction. | Alphanumeric string | | Authorization code (\`AUTHORIZATION\_CODE\`) | Unique code issued to identify the payment approval confirmation. | Alphanumeric string | | Card entry mode (\`CARD\_ENTRY\_MODE\`) | Corresponds to the card entry mode; identifies how data was captured at the terminal. | Alphanumeric string | | Segment detail (\`SEGMENT\_DETAIL\`) | Subunit detail; granular classification of transactions according to their nature and specific characteristics. | Alphanumeric string | | Short settlement date (\`SETTLEMENT\_DATE\_SHORT\`) | Short payment approval date in YYYY-MM-DD format. | Date (YYYY-MM-DD) | | Short transaction date (\`TRANSACTION\_DATE\_SHORT\`) | Payment creation date in YYYY-MM-DD format. | Date (YYYY-MM-DD) | | Short money release date (\`MONEY\_RELEASE\_DATE\_SHORT\`) | Payment release date in YYYY-MM-DD format. | Date (YYYY-MM-DD) | | Authenticated payer (\`AUTHENTICATED\_PAYER\`) | Indicator of whether the transaction was paid by an authenticated MP user or not. | Boolean |
