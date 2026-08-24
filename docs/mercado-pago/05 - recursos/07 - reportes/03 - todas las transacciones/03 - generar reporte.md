# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/resources/reports/account-money/generate.md

\# Generate report You can generate your Account money report through your Mercado Pago account or via API integration. Refer to the table below for more information. > NOTE > > We have created new columns that allow you to identify which digital wallets or banks your clients use when they pay with a Mercado Pago QR Code. Update your settings preferences \[from the panel\](https://www.mercadopago.com.ar/balance/reports/settlement\_v2/settings) or \[via API\](https://www.mercadopago.com.ar/developers/en/docs/additional-content/reports/account-money/api) so that you can include these columns in your reports. ## Generation channels There are two ways to generate an Available Balance report: | Channels | Description | | --- | --- | | Mercado Pago panel | Manually create the report through the Mercado Pago panel. Access \[your reports\](https://www.mercadopago.com.ar/balance/reports?page=1#!/settlement-report) , click \*\*Go to Payment and account statement reports\*\*, and select the report. For more information, read the documentation \[Generate report through the panel.\](https://www.mercadopago.com.ar/developers/en/docs/additional-content/reports/account-money/panel) | | API integration | Create the report manually or scheduled according to the desired frequency using our API integration. For more information, refer to the documentation \[Generate report via API.\](https://www.mercadopago.com.ar/developers/en/docs/additional-content/reports/account-money/api)

| ## Technical characteristics of the report Consider the following technical information when you want to generate, schedule and set up your reports. ### Report schedule Set up how and how often you want to generate your reports. | Element | Characteristics | | --- | --- | | Schedule |  
\- Daily  
\- Weekly  
\- Monthly

| | Generation |  
\- Manual  
\- Automatic

| ### Report structure Know the characteristics of the elements that make up your report. | Element or Action | Characteristics | | --- | --- | | Tables Detail |  
The detail of the tables includes information generated in at least 1 day.

| | Column Order |  
Permanent.

| | Maximum Period |  
Reports with data of up to 60 days.

| | Currency |  
Local (based on the country where the Mercado Pago account is registered).

| | Time zone of the columns |  
GMT-4

Take as reference the place where you download the report from.

| | Date selection via API |  
Timezone format: UTC / GMT-0\.

| | Date selection via web |  
It must be based on the timezone of the user's account.  
For example, the timezone of São Paulo corresponds to the user account registered in Brazil.

| ### Report export All the options you have available when downloading your report. | Element or Action | Characteristics | | --- | --- | | Filename format |  
When the report is scheduled or manual:  
"<prefix-configurable>-<yyyy-MM-dd-hhmmss>.<format>"  
Example: mystore-2019-05-28-104010.csv

| | Download formats |  
.csv, .xlsx

Tip: Download the report in .csv to import the data and use it in other applications. Download it in .xlsx to read the information in the spreadsheet tables.

| | File |  
The generated reports are saved in your Mercado Pago account.

| | Set up available via API |  
\- Columns to generate per report.  
\- File prefix for easy identification.  
\- SFTP upload.  
\- Column separator (period or semicolon).  
\- Email notification.

| ## Notifications ### Webhook Webhook (also known as "web callback") is a simple method that allows an application or system to send real-time data whenever a particular event takes place, that is, it is a way to passively receive information between two systems via an HTTP POST. In the case of the reports used for reconciliation, a notification is sent to the user who has set up this service when their files are generated. | Attribute | Description | |-----------------|------------------------------| | transaction\_id | Transaction ID | | request\_date | Request date | | generation\_date | Generation date | | files | Available files | | type | File format | | url | Download link | | name | File name | | status | Report status | | creation\_type | Manual or scheduled creation | | report\_type | Report type | | is\_test | Determines if it is a test | | signature | Notification signature | ### Password for encryption The encryption password is essential to secure the notification process to the system. In the message body (\_payload\_), an attribute called \*\*\_"signature"\_\*\* is sent to validate the legitimate origin of the Mercado Pago Webhook notification, avoiding possible imitations. The creation of the \*\*signature\*\* occurs by combining the \`transaction\_id\` with the \`encrypted password\` in the \*\*\_"Webhook Notification"\_\*\* section, along with the \`generation\_date\` of the report. These values are then encrypted using the \*\*\_BCrypt\_\*\* algorithm as follows: \`signature = BCrypt(transaction\_id + '-' + password\_for\_encryption + '-' + generation\_date)\` To validate that it is Mercado Pago who issued the notification, the \*\*\_verification function\_\*\* offered by the \*\*\_BCrypt\_\*\* algorithm for the desired language must be used. \*\*Java example:\*\* \`BCrypt.checkpw(transaction\_id + '-' + password\_for\_encryption + '-' + generation\_date, payload\_signature)\` > Have the \[Glossary of the report\](https://www.mercadopago.com.ar/developers/en/docs/additional-content/reports/account-money/glossary) on hand to review it when needed or want to review a technical term.
