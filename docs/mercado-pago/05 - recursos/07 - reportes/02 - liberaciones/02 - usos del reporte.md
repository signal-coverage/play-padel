# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/resources/reports/released-money/how-to-use.md

\# Report uses Once the report is ready and downloaded, you will have a file ready to consult spreadsheets and import them into the program you use. To review the report, we recommend downloading it in CSV format to open it in a program that can visualize it. The file should be configured in UTF-8 format to avoid reading issues. ## Report content | Report field | Description | | --- | --- | | Initial Available Balance |  
Initial balance. Indicates the amount available on the initial date of the period you selected for reconciliation.

| | Release |  
Details of releases of money, including the initial balance and transactions impacting the total balance.

| | Block |  
Money blocks due to disputes.

| | Unblock |  
Unblocks after dispute resolution.

| | Subtotal |  
Sum of transactions within each section.

| | Total|  
Final result composed of the sum of all subtotals.

In other words:  
subtotal \`Release\` + subtotal \`Block\` + subtotal \`Unblock\` = total result.

It is the difference between the total credited net amount and the total debited net amount. | Additionally, the report reflects accounting concepts of debit (money you need to pay) and credit (money you are due to receive), organizing the report into two columns, one for each concept: > Your \*\*credit\*\* will be in the \`NET\_CREDIT\_AMOUNT\` column. >  
\> Your \*\*debt\*\* will be in the \`NET\_DEBIT\_AMOUNT\` column. The available balances of transactions are displayed in the \`NET\_CREDIT\` (credit) and \`NET\_DEBIT\` (debit) columns according to positive or negative values. In these fields, the gross amount and discounts related to financing, taxes, and shipping costs are also detailed, resulting in the final net amount. If a transfer is not completed, the report remains valid. The amount will be refunded to your account, and the transaction will be displayed on a new line in the \`NET\_CREDIT\` column. > NOTE > > Have the \[Releases Report Glossary\](https://www.mercadopago.com.ar/developers/en/docs/additional-content/reports/released-money/report-fields) on hand to consult when needed to check any technical term. ## Report example Observe what comprises the Releases Report in the following example to identify the sections and analyze your own reports: !\[Reporte de liquidaciones\](https://www.mercadopago.com.ar/images/manage-account/reports/example-release-es-v1.jpg) The default version will show an extended view of the columns. The final report will have the most detailed information possible. ## Report organization See the following example for the organization of the report: !\[Reporte de Dinero retirado Ejemplos Mercado Pago\](https://www.mercadopago.com.ar/images/manage-account/reports/example-nledger-es-v1.jpg)
