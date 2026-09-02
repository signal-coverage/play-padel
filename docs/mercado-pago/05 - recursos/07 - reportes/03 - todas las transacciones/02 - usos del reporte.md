# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/resources/reports/account-money/how-to-use.md

\# Report uses Once the report is ready and downloaded, you will have a file to review the spreadsheets or import into the reconciliation program you use. To review the report we recommend downloading it in .csv format to open it in the program that you view it. Configure your program to support the UTF-8 format, so you avoid reading problems. ## Report content The report is made up of different types of transactions that you can see in the \`TRANSACTION\_TYPE\` column. Each of them will have the gross amount of the operation. | Transactions | Transaction type | | --- | --- | | \*SETTLEMENT\* |  
Approved

| | \*REFUND\* |  
Total or partial returns

| | \*CHARGEBACK\* |  
Chargeback

| | \*DISPUTE\* |  
In a complaint

| | \*WITHDRAWAL\* |  
Money withdrawn

| | \*CASHBACK\* |  
Cashback

| | \*SETTLEMENT\_SHIPPING\* |  
Approved shipments

| | \*REFUND\_SHIPPING\* |  
Total or partial returns of shipping costs

| | \*CHARGEBACK\_SHIPPING\* |  
Shipping chargeback

| | \*DISPUTE\_SHIPPING\* |  
The shipment is in claim

| And in the \`SETTLEMENT\_NET\_AMOUNT\` column you will find the real impact on your account money balance. > NOTE > > Have the \[Glossary of the Account money report\](https://www.mercadopago.com.ar/developers/en/guides/additional-content/reports/account-money/glossary) on hand to review it when needed or want to review a technical term. ## Report example Note how the Account money report is composed in this example to identify the operations and read your own reports: !\[Reporte de dinero en cuenta Ejemplos Mercado Pago\](https://www.mercadopago.com.ar/images/manage-account/reports/example-settlement-en-v1.png) The default version will show an extended view of the columns. The final report will have as much detail as possible.
