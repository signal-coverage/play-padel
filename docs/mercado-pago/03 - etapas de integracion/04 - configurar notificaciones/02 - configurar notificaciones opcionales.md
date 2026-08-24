# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/optional-notifications.md

\# Configure optional notifications Additionally, beyond the primary orders topic, Mercado Pago offers optional topics that notify your application about integration management events: account linking via OAuth, buyer-initiated claims, chargebacks, and fraud alerts. These notifications complement the main flow and allow you to keep your system in sync with events that go beyond payment processing. None of these topics replace the orders topic nor are they mandatory. Activate only the ones relevant to your integration. ## Available topics | Topic | Panel name | Description | |---|---|---| | \`mp-connect\` | Application linking | Notifies when an account is linked or unlinked through \[OAuth\](https://www.mercadopago.com.ar/developers/en/docs/security/oauth). Applies to all integrations using OAuth. | | \`topic\_claims\_integration\_wh\` | Claims | Notifies when a buyer initiates a claim or when a status change occurs. | | \`topic\_chargebacks\_wh\` | Chargebacks | Notifies when the buyer initiates a chargeback or a status change occurs. For more information, see the \[chargebacks documentation\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/chargebacks). | | \`stop\_delivery\_op\_wh\` | Fraud alerts | Notifies when a fraud alert is detected on an order. Upon receiving it, you must cancel the order without delivering it. | ## Configure Webhooks Follow the steps below to activate the optional topics in your integration. 1\. Access \[Your integrations\](https://www.mercadopago.com/developers/panel/app) and select the application for which you want to activate notifications. !\[configure notifications\](https://www.mercadopago.com.ar/images/api-orders/not1-app-es-v1.png) 2\. In the left menu, select \*\*Webhooks > Configure notifications\*\*. !\[configure notifications\](https://www.mercadopago.com.ar/images/api-orders/not2-configure-es-v1.png) 3\. Select the \*\*Production mode\*\* tab and provide an \`HTTPS URL\` to receive notifications. 4\. In the optional topics section, select the events you want to activate: \*\*Application linking\*\*, \*\*Claims\*\*, \*\*Chargebacks\*\*, and/or \*\*Fraud alerts\*\*. 5\. Finally, click \*\*Save configuration\*\*. This will generate a :toolTipComponent\[secret key\]{content="Key used to validate the authenticity of each notification received." link="/developers/en/docs/your-integrations/notifications/webhooks"} for your application. Note that this key has no expiration date and periodic renewal is not required, although it is recommended. To do so, simply click the \*\*Reset\*\* button. ## Simulate receiving the notification To ensure that notifications are configured correctly, simulate receiving them by following the step-by-step below. 1\. After configuring the URL and events, click \*\*Save configuration\*\*. 2\. Then, click \*\*Simulate\*\* to verify that the indicated URL is receiving notifications correctly. 3\. On the simulation screen, select the URL to be tested. 4\. Choose the event type you want to test and enter the \*\*Resource ID\*\* to be sent in the notification body (\`Data ID\`). !\[cofigure notifications\](https://www.mercadopago.com.ar/images/api-orders/not5-order-es-v2.png) 5\. Finally, click \*\*Send test\*\* to verify the request, the server response, and the event description. ## Validate the notification origin Validating the origin of a notification is essential to ensure the security and authenticity of the information received. This process helps prevent fraud and ensures that only legitimate notifications are processed. Mercado Pago will send your server a notification that includes the following components: - \*\*\_Query params\_\*\*: Accompany the request URL. They contain \`data.id\` with the notified resource identifier and \`type\` with the topic name. - \*\*\_Body\_\*\*: Contains the details of the notified event, such as \`action\`, \`api\_version\`, \`application\_id\`, \`date\_created\`, \`id\`, \`live\_mode\`, \`type\`, \`user\_id\` and \`data\`. - \*\*\_Header\_\*\*: Includes the secret signature \`x-signature\`, which allows validating the authenticity of the notification. Below are examples of notifications for each topic. ::::TabsComponent :::TabComponent{title="Application linking"} \`\`\` POST /?data.id=123456789&type=mp-connect HTTP/1.1 Host: test-optional-nots.requestcatcher.com Accept: \*/\* Accept-Encoding: \* Connection: keep-alive Content-Length: 187 Content-Type: application/json User-Agent: restclient-node/5.1.10 X-Request-Id: 4ed4fa2b-0b31-42ec-a62f-ad793c486c59 X-Rest-Pool-Name: /services/webhooks.js X-Retry: 0 X-Signature: ts=1781009491,v1=654866c48793d9f716f255f8a8e6cb162f643d93b29391daa6ac7ce78cf0ce81 X-Socket-Timeout: 22000 {"action":"application.authorized","api\_version":"v1","data":{"id":"123456789"},"date\_created":"2026-06-12T13:14:01.351Z","id":100000000000,"live\_mode":true,"type":"mp-connect","user\_id":123456789} \`\`\` | Field | Type | Description | |---|---|---| | \`action\` | string | Notified event. Possible values: \`application.authorized\` (linking) and \`application.deauthorized\` (unlinking). | | \`api\_version\` | string | API version. Always \`v1\`. | | \`data.id\` | string | Identifier of the resource associated with the event. | | \`date\_created\` | string | Notification creation date (ISO 8601). | | \`id\` | long | Unique notification identifier. Use it for idempotency control. | | \`live\_mode\` | boolean | \`true\` in production, \`false\` in test mode. | | \`type\` | string | Always \`mp-connect\`. | | \`user\_id\` | long | Identifier of the seller for whom the notification is sent. | ::: :::TabComponent{title="Claims"} \`\`\` POST /?data.id=1234567890&type=claim HTTP/1.1 Host: test-optional-nots.requestcatcher.com Accept: \*/\* Accept-Encoding: \* Connection: keep-alive Content-Length: 207 Content-Type: application/json User-Agent: restclient-node/5.1.10 X-Request-Id: 1d07590a-fd51-4e67-8b13-7d45600670e5 X-Rest-Pool-Name: /services/webhooks.js X-Retry: 0 X-Signature: ts=1781009658,v1=e446ded9a9e0dd94acba3fd0fa9e35e497abcf2ef11a6d0f5291f7c7eab00fb7 X-Socket-Timeout: 22000 {"action":"updated","api\_version":"v1","data":{"id":1234567890,"resource":"/v1/claims/1234567890"},"date\_created":"2026-06-12T06:14:40-04:00","id":"00000000-0000-0000-0000-000000000001","live\_mode":true,"type":"claim","user\_id":123456789} \`\`\` | Field | Type | Description | |---|---|---| | \`action\` | string | Notified event. Indicates the action that occurred on the claim. | | \`api\_version\` | string | API version. Always \`v1\`. | | \`data.id\` | long | Unique identifier of the claim. | | \`data.resource\` | string | Path of the claim resource in the API. | | \`date\_created\` | string | Notification creation date (ISO 8601). | | \`id\` | string | Unique notification identifier (UUID). Use it for idempotency control. | | \`live\_mode\` | boolean | \`true\` in production, \`false\` in test mode. | | \`type\` | string | Always \`claim\`. | | \`user\_id\` | long | Identifier of the seller for whom the notification is sent. | ::: :::TabComponent{title="Chargebacks"} \`\`\` POST /?data.id=123456&type=topic\_chargebacks\_wh HTTP/1.1 Host: test-optional-nots.requestcatcher.com Accept: \*/\* Accept-Encoding: \* Connection: keep-alive Content-Type: application/json User-Agent: restclient-node/5.1.10 X-Request-Id: 948ac0a7-bf77-4877-8fe8-8ab69a356fa4 X-Rest-Pool-Name: /services/webhooks.js X-Retry: 0 X-Signature: ts=1781009697,v1=108c6756aa1b96a5303b41769bb89261ebeb2922333b483886502f5b7ae3d79d X-Socket-Timeout: 22000 {"action":"order.charged\_back","api\_version":"v1","application\_id":"1234567890123456","data":{"external\_reference":"ext\_ref\_1234","id":"ORD01JRTXT3GC8CJGW394QWYQ9VP3","status":"charged\_back","status\_detail":"settled","total\_amount":"200.00","total\_paid\_amount":"200.00","transactions":{"payments":\[{"id":"PAY01JRTXT3GC8CJGW394QZZ349N6","amount":"200.00","paid\_amount":"200.00","payment\_method":{"id":"master","installments":1,"type":"credit\_card"},"status":"charged\_back","status\_detail":"settled","reference":{"id":"ref-0"}}\],"chargebacks":\[{"id":"CBK12JRTXT3GC8CJGW394QZZ349M7","transaction\_id":"PAY01JT4211RXR4678HH8304SDKW4","case\_id":"123456789","status":"settled","amount":"200.00"}\]},"type":"online","version":1},"date\_created":"2025-04-14T19:53:23.114998555Z","live\_mode":false,"type":"order","user\_id":"123456789"} \`\`\` For more information about chargeback management, see the \[chargeback documentation\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/chargebacks/management). ::: :::TabComponent{title="Fraud alerts"} \`\`\` POST /?data.id=123456&type=stop\_delivery\_op\_wh HTTP/1.1 Host: test-optional-nots.requestcatcher.com Accept: \*/\* Accept-Encoding: \* Connection: keep-alive Content-Length: 269 Content-Type: application/json User-Agent: restclient-node/5.1.10 X-Request-Id: 1840ae55-d7e2-414b-addb-66134517009d X-Rest-Pool-Name: /services/webhooks.js X-Retry: 0 X-Signature: ts=1781009553,v1=e9954b6139ba28349a498bce19c06e45d85f494a3c67ccfc13d3a0e3d8eabe55 X-Socket-Timeout: 22000 {"action":"Created","api\_version":"v1","data":{"description":"desc","merchant\_order":45679012,"payment\_id":123454321,"site\_id":"MLA"},"date\_created":"2021-11-01T02:02:02-04:00","id":"123456","live\_mode":true,"type":"stop\_delivery\_op\_wh","user\_id":169526408,"version":1} \`\`\` | Field | Type | Description | |---|---|---| | \`action\` | string | Always \`Created\`. | | \`data.merchant\_order\` | long | Identifier of the order that generated the alert. | | \`data.payment\_id\` | long | Associated payment identifier. | | \`data.site\_id\` | string | Site identifier (country). | | \`date\_created\` | string | Notification creation date (ISO 8601). | | \`id\` | string | Notification identifier. | | \`live\_mode\` | boolean | \`true\` in production, \`false\` in test mode. | | \`type\` | string | Always \`stop\_delivery\_op\_wh\`. | | \`user\_id\` | long | Seller identifier. | | \`version\` | integer | Event version. | ::: :::: From the received notification, you can validate the authenticity of its origin through the secret key. This key will be sent in the \`x-signature\` header, with the following format: \`\`\` ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b \`\`\` To confirm the validation, it is necessary to extract the key from the \_header\_ and compare it with the key provided for your application in \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app). Follow one of the approaches below to validate the authenticity of the notification. ::::TabsComponent :::TabComponent{title="With SDKs"} The \`WebhookSignatureValidator\` from the official SDK resolves validation internally by following these steps: 1\. Your server receives a \*\*POST\*\* from Mercado Pago with the \`x-signature\` and \`x-request-id\` headers, and the \`data.id\` query param. 2\. The SDK extracts the timestamp (\`ts\`) and hash (\`v1\`) from \`x-signature\`. 3\. The SDK builds the manifest: \`id:;request-id:;ts:;\`. If any of the values is not present in the received notification, that pair is omitted from the manifest. 4\. The SDK calculates \`HMAC-SHA256(secret key, manifest)\` in hexadecimal. 5\. It compares the calculated hash against \`v1\` in constant time to prevent attacks. If they match, the notification is legitimate. If not, it throws a typed exception and your server must respond with \`401\`. To get your secret key (\`secret\`), in \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app) select the application, click \*\*Webhooks > Configure notification\*\*, and reveal the generated key.

- [csharp ](#editor%5F5)
- [go ](#editor%5F4)
- [java ](#editor%5F6)
- [javascript ](#editor%5F2)
- [php ](#editor%5F1)
- [python ](#editor%5F3)
- [ruby ](#editor%5F7)
  php javascript python go csharp java ruby

```
<?php
use MercadoPago\Webhook\WebhookSignatureValidator;
use MercadoPago\Exceptions\InvalidWebhookSignatureException;

try {
  WebhookSignatureValidator::validate(
  $_SERVER['HTTP_X_SIGNATURE'],
  $_SERVER['HTTP_X_REQUEST_ID'],
  $_GET['data_id'],
  $secret
  );
  http_response_code(200);
} catch (InvalidWebhookSignatureException $e) {
  http_response_code(401);
}
```

Copiar

```
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';

try {
  WebhookSignatureValidator.validate({
  xSignature: req.headers['x-signature'],
  xRequestId: req.headers['x-request-id'],
  dataId: req.query['data.id'],
  secret,
  });
  res.sendStatus(200);
} catch (err) {
  if (err instanceof InvalidWebhookSignatureError) res.status(401).end();
  else throw err;
}
```

Copiar

```
from mercadopago.webhook import WebhookSignatureValidator, InvalidWebhookSignatureError

try:
  WebhookSignatureValidator.validate(
  request.headers.get("x-signature"),
  request.headers.get("x-request-id"),
  request.args.get("data.id"),
  secret,
  )
  return "", 200
except InvalidWebhookSignatureError:
  return "", 401
```

Copiar

```
import "github.com/mercadopago/sdk-go/pkg/webhook"

err := webhook.ValidateSignature(
  r.Header.Get("x-signature"),
  r.Header.Get("x-request-id"),
  r.URL.Query().Get("data.id"),
  secret,
)
if err != nil {
  w.WriteHeader(http.StatusUnauthorized)
  return
}
w.WriteHeader(http.StatusOK)
```

Copiar

```
using MercadoPago.Error;
using MercadoPago.Webhook;

try {
  WebhookSignatureValidator.Validate(
  xSignature: Request.Headers["x-signature"],
  xRequestId: Request.Headers["x-request-id"],
  dataId: Request.Query["data.id"],
  secret: secret);
  return Ok();
} catch (InvalidWebhookSignatureException) {
  return Unauthorized();
}
```

Copiar

```
import com.mercadopago.webhook.WebhookSignatureValidator;
import com.mercadopago.exceptions.MPInvalidWebhookSignatureException;

try {
  WebhookSignatureValidator.validate(
  request.getHeader("x-signature"),
  request.getHeader("x-request-id"),
  request.getParameter("data.id"),
  secret);
  response.setStatus(200);
} catch (MPInvalidWebhookSignatureException e) {
  response.setStatus(401);
}
```

Copiar

```
require 'mercadopago/webhook/validator'

begin
  Mercadopago::Webhook::Validator.validate(
  request.headers['x-signature'],
  request.headers['x-request-id'],
  request.params['data.id'],
  secret
  )
  head :ok
rescue Mercadopago::Webhook::InvalidWebhookSignatureError
  head :unauthorized
end
```

Copiar

::: :::TabComponent{title="Without SDKs"} If you don't use the official SDK, you can manually validate the authenticity of notifications by following these steps: 1\. To extract the \_timestamp\_ (\`ts\`) and key (\`v1\`) from the \`x-signature\` \_header\_, divide the \_header\_ content by the \`,\` character, which will result in a list of elements. The value for the \`ts\` prefix is the notification \_timestamp\_ (in milliseconds) and \`v1\` is the encrypted key. 2\. Using the \_template\_ below, substitute the parameters with the data received in your notification. \`\`\` id:\[data.id\_url\];request-id:\[x-request-id\_header\];ts:\[ts\_header\]; \`\`\` - \`\[data.id\_url\]\` will be replaced by the value of the \`data.id\` parameter received in the URL \_query params\_. - \`\[x-request-id\_header\]\` must be replaced by the value received in the \`x-request-id\` \_header\_. - \`\[ts\_header\]\` will be the \`ts\` value extracted from the \`x-signature\` \_header\_. > NOTE > > If any of the values (\`data.id\`, \`x-request-id\`) are not present in the received notification, you must remove them from the manifest before computing the \`HMAC\`. 3\. In \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app), select the integrated application, click \*\*Webhooks > Configure notification\*\* and reveal the generated secret key. 4\. Generate the counter-key for validation. To do this, compute an \[HMAC\](https://en.wikipedia.org/wiki/HMAC) with the \`SHA256 hash\` function in hexadecimal base, using the secret key as the key and the \_template\_ with the values as the message.

- [java ](#editor%5F10)
- [node ](#editor%5F9)
- [php ](#editor%5F8)
- [python ](#editor%5F11)
  php node java python

```
$cyphedSignature = hash_hmac('sha256', $data, $key);
```

Copiar

```
const crypto = require('crypto');
const cyphedSignature = crypto
  .createHmac('sha256', secret)
  .update(signatureTemplateParsed)
  .digest('hex');
```

Copiar

```
String cyphedSignature = new HmacUtils("HmacSHA256", secret).hmacHex(signedTemplate);
```

Copiar

```
import hashlib, hmac, binascii

cyphedSignature = binascii.hexlify(hmac.new(secret.encode(), signedTemplate.encode(), hashlib.sha256).digest())
```

Copiar

5\. Finally, compare the generated key with the key extracted from the \_header\_, ensuring they match exactly. Additionally, you can use the \_timestamp\_ extracted from the \_header\_ to compare it with a \_timestamp\_ generated at the time of receipt, in order to establish a delay tolerance in receiving the message. Here are complete code examples:

- [csharp ](#editor%5F16)
- [go ](#editor%5F15)
- [java ](#editor%5F17)
- [javascript ](#editor%5F13)
- [php ](#editor%5F12)
- [python ](#editor%5F14)
- [ruby ](#editor%5F18)
  php javascript python go csharp java ruby

```
<?php
$xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
$dataID = strtolower($_GET['data_id'] ?? ''); // PHP converts dots in query param names to underscores

$ts = null;
$hash = null;
foreach (explode(',', $xSignature) as $part) {
  $kv = explode('=', $part, 2);
  if (count($kv) !== 2) continue;
  $key = trim($kv[0]);
  $value = trim($kv[1]);
  if ($key === 'ts') $ts = $value;
  if ($key === 'v1') $hash = $value;
}

$parts = [];
if ($dataID !== '') $parts[] = "id:{$dataID}";
if ($xRequestId !== '') $parts[] = "request-id:{$xRequestId}";
$parts[] = "ts:{$ts}";
$manifest = implode(';', $parts) . ';';

$computed = hash_hmac('sha256', $manifest, $secret);
if (!hash_equals($computed, $hash)) {
  http_response_code(401);
  exit;
}
http_response_code(200);
```

Copiar

```
const xSignature = req.headers['x-signature'] ?? '';
const xRequestId = req.headers['x-request-id'] ?? '';
const dataId = (req.query['data.id'] ?? '').toLowerCase();

let ts, hash;
for (const part of xSignature.split(',')) {
  const eq = part.indexOf('=');
  if (eq === -1) continue;
  const key = part.slice(0, eq).trim();
  const val = part.slice(eq + 1).trim();
  if (key === 'ts') ts = val;
  if (key === 'v1') hash = val;
}

const parts = [];
if (dataId) parts.push(`id:${dataId}`);
if (xRequestId) parts.push(`request-id:${xRequestId}`);
parts.push(`ts:${ts}`);
const manifest = parts.join(';') + ';';

const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) {
  res.status(401).end();
  return;
}
res.sendStatus(200);
```

Copiar

```
import hashlib
import hmac

x_signature = request.headers.get("x-signature", "")
x_request_id = request.headers.get("x-request-id", "")
data_id = (request.args.get("data.id", "") or "").lower()

ts = hash_value = None
for part in x_signature.split(","):
  if "=" not in part:
  continue
  key, _, value = part.partition("=")
  key = key.strip()
  value = value.strip()
  if key == "ts": ts = value
  if key == "v1": hash_value = value

parts = []
if data_id: parts.append(f"id:{data_id}")
if x_request_id: parts.append(f"request-id:{x_request_id}")
parts.append(f"ts:{ts}")
manifest = ";".join(parts) + ";"

computed = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
if not hmac.compare_digest(computed, hash_value):
  return "", 401
return "", 200
```

Copiar

```
import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "net/http"
  "strings"
)

xSignature := r.Header.Get("x-signature")
xRequestID := r.Header.Get("x-request-id")
dataID := strings.ToLower(r.URL.Query().Get("data.id"))

var ts, hash string
for _, part := range strings.Split(xSignature, ",") {
  kv := strings.SplitN(part, "=", 2)
  if len(kv) != 2 { continue }
  key := strings.TrimSpace(kv[0])
  val := strings.TrimSpace(kv[1])
  if key == "ts" { ts = val }
  if key == "v1" { hash = val }
}

var parts []string
if dataID != "" { parts = append(parts, "id:"+dataID) }
if xRequestID != "" { parts = append(parts, "request-id:"+xRequestID) }
parts = append(parts, "ts:"+ts)
manifest := strings.Join(parts, ";") + ";"

mac := hmac.New(sha256.New, []byte(secret))
mac.Write([]byte(manifest))
computed := hex.EncodeToString(mac.Sum(nil))

if !hmac.Equal([]byte(computed), []byte(hash)) {
  w.WriteHeader(http.StatusUnauthorized)
  return
}
w.WriteHeader(http.StatusOK)
```

Copiar

using System.Security.Cryptography; using System.Text; var xSignature = Request.Headers\["x-signature"\].ToString(); var xRequestId = Request.Headers\["x-request-id"\].ToString(); var dataId = (Request.Query\["data.id"\].ToString() ?? "").ToLowerInvariant(); string ts = null, hash = null; foreach (var part in xSignature.Split(',')) { var eq = part.IndexOf('='); if (eq < 0) continue; var key = part\[..eq\].Trim(); var val = part\[(eq + 1)..\].Trim(); if (key == "ts") ts = val; if (key == "v1") hash = val; } var parts = new List<string>(); if (!string.IsNullOrEmpty(dataId)) parts.Add(\[\[\[ \`\`\`php <?php $xSignature = $\_SERVER\['HTTP\_X\_SIGNATURE'\] ?? ''; $xRequestId = $\_SERVER\['HTTP\_X\_REQUEST\_ID'\] ?? ''; $dataID = strtolower($\_GET\['data\_id'\] ?? ''); // PHP converts dots in query param names to underscores $ts = null; $hash = null; foreach (explode(',', $xSignature) as $part) { $kv = explode('=', $part, 2); if (count($kv) !== 2) continue; $key = trim($kv\[0\]); $value = trim($kv\[1\]); if ($key === 'ts') $ts = $value; if ($key === 'v1') $hash = $value; } $parts = \[\]; if ($dataID !== '') $parts\[\] = "id:{$dataID}"; if ($xRequestId !== '') $parts\[\] = "request-id:{$xRequestId}"; $parts\[\] = "ts:{$ts}"; $manifest = implode(';', $parts) . ';'; $computed = hash\_hmac('sha256', $manifest, $secret); if (!hash\_equals($computed, $hash)) { http\_response\_code(401); exit; } http\_response\_code(200); \`\`\` \`\`\`javascript const xSignature = req.headers\['x-signature'\] ?? ''; const xRequestId = req.headers\['x-request-id'\] ?? ''; const dataId = (req.query\['data.id'\] ?? '').toLowerCase(); let ts, hash; for (const part of xSignature.split(',')) { const eq = part.indexOf('='); if (eq === -1) continue; const key = part.slice(0, eq).trim(); const val = part.slice(eq + 1).trim(); if (key === 'ts') ts = val; if (key === 'v1') hash = val; } const parts = \[\]; if (dataId) parts.push(\`id:${dataId}\`); if (xRequestId) parts.push(\`request-id:${xRequestId}\`); parts.push(\`ts:${ts}\`); const manifest = parts.join(';') + ';'; const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex'); if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) { res.status(401).end(); return; } res.sendStatus(200); \`\`\` \`\`\`python import hashlib import hmac x\_signature = request.headers.get("x-signature", "") x\_request\_id = request.headers.get("x-request-id", "") data\_id = (request.args.get("data.id", "") or "").lower() ts = hash\_value = None for part in x\_signature.split(","): if "=" not in part: continue key, \_, value = part.partition("=") key = key.strip() value = value.strip() if key == "ts": ts = value if key == "v1": hash\_value = value parts = \[\] if data\_id: parts.append(f"id:{data\_id}") if x\_request\_id: parts.append(f"request-id:{x\_request\_id}") parts.append(f"ts:{ts}") manifest = ";".join(parts) + ";" computed = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest() if not hmac.compare\_digest(computed, hash\_value): return "", 401 return "", 200 \`\`\` \`\`\`go import ( "crypto/hmac" "crypto/sha256" "encoding/hex" "net/http" "strings" ) xSignature := r.Header.Get("x-signature") xRequestID := r.Header.Get("x-request-id") dataID := strings.ToLower(r.URL.Query().Get("data.id")) var ts, hash string for \_, part := range strings.Split(xSignature, ",") { kv := strings.SplitN(part, "=", 2) if len(kv) != 2 { continue } key := strings.TrimSpace(kv\[0\]) val := strings.TrimSpace(kv\[1\]) if key == "ts" { ts = val } if key == "v1" { hash = val } } var parts \[\]string if dataID != "" { parts = append(parts, "id:"+dataID) } if xRequestID != "" { parts = append(parts, "request-id:"+xRequestID) } parts = append(parts, "ts:"+ts) manifest := strings.Join(parts, ";") + ";" mac := hmac.New(sha256.New, \[\]byte(secret)) mac.Write(\[\]byte(manifest)) computed := hex.EncodeToString(mac.Sum(nil)) if !hmac.Equal(\[\]byte(computed), \[\]byte(hash)) { w.WriteHeader(http.StatusUnauthorized) return } w.WriteHeader(http.StatusOK) \`\`\` \`\`\`csharp using System.Security.Cryptography; using System.Text; var xSignature = Request.Headers\["x-signature"\].ToString(); var xRequestId = Request.Headers\["x-request-id"\].ToString(); var dataId = (Request.Query\["data.id"\].ToString() ?? "").ToLowerInvariant(); string ts = null, hash = null; foreach (var part in xSignature.Split(',')) { var eq = part.IndexOf('='); if (eq < 0) continue; var key = part\[..eq\].Trim(); var val = part\[(eq + 1)..\].Trim(); if (key == "ts") ts = val; if (key == "v1") hash = val; } var parts = new List(); if (!string.IsNullOrEmpty(dataId)) parts.Add($"id:{dataId}"); if (!string.IsNullOrEmpty(xRequestId)) parts.Add($"request-id:{xRequestId}"); parts.Add($"ts:{ts}"); var manifest = string.Join(";", parts) + ";"; using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(secret)); var computed = BitConverter .ToString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes(manifest))) .Replace("-", "").ToLowerInvariant(); if (!CryptographicOperations.FixedTimeEquals( Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash))) { return Unauthorized(); } return Ok(); \`\`\` \`\`\`java import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.util.ArrayList; import java.util.List; String xSignature = request.getHeader("x-signature") != null ? request.getHeader("x-signature") : ""; String xRequestId = request.getHeader("x-request-id") != null ? request.getHeader("x-request-id") : ""; String dataId = request.getParameter("data.id") != null ? request.getParameter("data.id").toLowerCase() : ""; String ts = null, hash = null; for (String part : xSignature.split(",")) { String\[\] kv = part.split("=", 2); if (kv.length != 2) continue; String key = kv\[0\].trim(); String val = kv\[1\].trim(); if ("ts".equals(key)) ts = val; if ("v1".equals(key)) hash = val; } List parts = new ArrayList<>(); if (!dataId.isEmpty()) parts.add("id:" + dataId); if (!xRequestId.isEmpty()) parts.add("request-id:" + xRequestId); parts.add("ts:" + ts); String manifest = String.join(";", parts) + ";"; Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF\_8), "HmacSHA256")); byte\[\] bytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF\_8)); StringBuilder sb = new StringBuilder(); for (byte b : bytes) sb.append(String.format("%02x", b & 0xff)); String computed = sb.toString(); if (!MessageDigest.isEqual( computed.getBytes(StandardCharsets.UTF\_8), hash.getBytes(StandardCharsets.UTF\_8))) { response.setStatus(401); return; } response.setStatus(200); \`\`\` \`\`\`ruby require 'openssl' x\_signature = request.headers\['x-signature'\] || '' x\_request\_id = request.headers\['x-request-id'\] || '' data\_id = (params\['data.id'\] || '').downcase ts = hash\_value = nil x\_signature.split(',').each do |part| key, value = part.split('=', 2) next unless key && value ts = value.strip if key.strip == 'ts' hash\_value = value.strip if key.strip == 'v1' end parts = \[\] parts << "id:#{data\_id}" unless data\_id.empty? parts << "request-id:#{x\_request\_id}" unless x\_request\_id.empty? parts << "ts:#{ts}" manifest = "#{parts.join(';')};" computed = OpenSSL::HMAC.hexdigest('SHA256', secret, manifest) unless OpenSSL.fixed\_length\_secure\_compare(computed, hash\_value) head :unauthorized return end head :ok \`\`\` \]\]\]quot;id:{dataId}"); if (!string.IsNullOrEmpty(xRequestId)) parts.Add(\[\[\[ \`\`\`php <?php $xSignature = $\_SERVER\['HTTP\_X\_SIGNATURE'\] ?? ''; $xRequestId = $\_SERVER\['HTTP\_X\_REQUEST\_ID'\] ?? ''; $dataID = strtolower($\_GET\['data\_id'\] ?? ''); // PHP converts dots in query param names to underscores $ts = null; $hash = null; foreach (explode(',', $xSignature) as $part) { $kv = explode('=', $part, 2); if (count($kv) !== 2) continue; $key = trim($kv\[0\]); $value = trim($kv\[1\]); if ($key === 'ts') $ts = $value; if ($key === 'v1') $hash = $value; } $parts = \[\]; if ($dataID !== '') $parts\[\] = "id:{$dataID}"; if ($xRequestId !== '') $parts\[\] = "request-id:{$xRequestId}"; $parts\[\] = "ts:{$ts}"; $manifest = implode(';', $parts) . ';'; $computed = hash\_hmac('sha256', $manifest, $secret); if (!hash\_equals($computed, $hash)) { http\_response\_code(401); exit; } http\_response\_code(200); \`\`\` \`\`\`javascript const xSignature = req.headers\['x-signature'\] ?? ''; const xRequestId = req.headers\['x-request-id'\] ?? ''; const dataId = (req.query\['data.id'\] ?? '').toLowerCase(); let ts, hash; for (const part of xSignature.split(',')) { const eq = part.indexOf('='); if (eq === -1) continue; const key = part.slice(0, eq).trim(); const val = part.slice(eq + 1).trim(); if (key === 'ts') ts = val; if (key === 'v1') hash = val; } const parts = \[\]; if (dataId) parts.push(\`id:${dataId}\`); if (xRequestId) parts.push(\`request-id:${xRequestId}\`); parts.push(\`ts:${ts}\`); const manifest = parts.join(';') + ';'; const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex'); if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) { res.status(401).end(); return; } res.sendStatus(200); \`\`\` \`\`\`python import hashlib import hmac x\_signature = request.headers.get("x-signature", "") x\_request\_id = request.headers.get("x-request-id", "") data\_id = (request.args.get("data.id", "") or "").lower() ts = hash\_value = None for part in x\_signature.split(","): if "=" not in part: continue key, \_, value = part.partition("=") key = key.strip() value = value.strip() if key == "ts": ts = value if key == "v1": hash\_value = value parts = \[\] if data\_id: parts.append(f"id:{data\_id}") if x\_request\_id: parts.append(f"request-id:{x\_request\_id}") parts.append(f"ts:{ts}") manifest = ";".join(parts) + ";" computed = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest() if not hmac.compare\_digest(computed, hash\_value): return "", 401 return "", 200 \`\`\` \`\`\`go import ( "crypto/hmac" "crypto/sha256" "encoding/hex" "net/http" "strings" ) xSignature := r.Header.Get("x-signature") xRequestID := r.Header.Get("x-request-id") dataID := strings.ToLower(r.URL.Query().Get("data.id")) var ts, hash string for \_, part := range strings.Split(xSignature, ",") { kv := strings.SplitN(part, "=", 2) if len(kv) != 2 { continue } key := strings.TrimSpace(kv\[0\]) val := strings.TrimSpace(kv\[1\]) if key == "ts" { ts = val } if key == "v1" { hash = val } } var parts \[\]string if dataID != "" { parts = append(parts, "id:"+dataID) } if xRequestID != "" { parts = append(parts, "request-id:"+xRequestID) } parts = append(parts, "ts:"+ts) manifest := strings.Join(parts, ";") + ";" mac := hmac.New(sha256.New, \[\]byte(secret)) mac.Write(\[\]byte(manifest)) computed := hex.EncodeToString(mac.Sum(nil)) if !hmac.Equal(\[\]byte(computed), \[\]byte(hash)) { w.WriteHeader(http.StatusUnauthorized) return } w.WriteHeader(http.StatusOK) \`\`\` \`\`\`csharp using System.Security.Cryptography; using System.Text; var xSignature = Request.Headers\["x-signature"\].ToString(); var xRequestId = Request.Headers\["x-request-id"\].ToString(); var dataId = (Request.Query\["data.id"\].ToString() ?? "").ToLowerInvariant(); string ts = null, hash = null; foreach (var part in xSignature.Split(',')) { var eq = part.IndexOf('='); if (eq < 0) continue; var key = part\[..eq\].Trim(); var val = part\[(eq + 1)..\].Trim(); if (key == "ts") ts = val; if (key == "v1") hash = val; } var parts = new List(); if (!string.IsNullOrEmpty(dataId)) parts.Add($"id:{dataId}"); if (!string.IsNullOrEmpty(xRequestId)) parts.Add($"request-id:{xRequestId}"); parts.Add($"ts:{ts}"); var manifest = string.Join(";", parts) + ";"; using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(secret)); var computed = BitConverter .ToString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes(manifest))) .Replace("-", "").ToLowerInvariant(); if (!CryptographicOperations.FixedTimeEquals( Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash))) { return Unauthorized(); } return Ok(); \`\`\` \`\`\`java import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.util.ArrayList; import java.util.List; String xSignature = request.getHeader("x-signature") != null ? request.getHeader("x-signature") : ""; String xRequestId = request.getHeader("x-request-id") != null ? request.getHeader("x-request-id") : ""; String dataId = request.getParameter("data.id") != null ? request.getParameter("data.id").toLowerCase() : ""; String ts = null, hash = null; for (String part : xSignature.split(",")) { String\[\] kv = part.split("=", 2); if (kv.length != 2) continue; String key = kv\[0\].trim(); String val = kv\[1\].trim(); if ("ts".equals(key)) ts = val; if ("v1".equals(key)) hash = val; } List parts = new ArrayList<>(); if (!dataId.isEmpty()) parts.add("id:" + dataId); if (!xRequestId.isEmpty()) parts.add("request-id:" + xRequestId); parts.add("ts:" + ts); String manifest = String.join(";", parts) + ";"; Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF\_8), "HmacSHA256")); byte\[\] bytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF\_8)); StringBuilder sb = new StringBuilder(); for (byte b : bytes) sb.append(String.format("%02x", b & 0xff)); String computed = sb.toString(); if (!MessageDigest.isEqual( computed.getBytes(StandardCharsets.UTF\_8), hash.getBytes(StandardCharsets.UTF\_8))) { response.setStatus(401); return; } response.setStatus(200); \`\`\` \`\`\`ruby require 'openssl' x\_signature = request.headers\['x-signature'\] || '' x\_request\_id = request.headers\['x-request-id'\] || '' data\_id = (params\['data.id'\] || '').downcase ts = hash\_value = nil x\_signature.split(',').each do |part| key, value = part.split('=', 2) next unless key && value ts = value.strip if key.strip == 'ts' hash\_value = value.strip if key.strip == 'v1' end parts = \[\] parts << "id:#{data\_id}" unless data\_id.empty? parts << "request-id:#{x\_request\_id}" unless x\_request\_id.empty? parts << "ts:#{ts}" manifest = "#{parts.join(';')};" computed = OpenSSL::HMAC.hexdigest('SHA256', secret, manifest) unless OpenSSL.fixed\_length\_secure\_compare(computed, hash\_value) head :unauthorized return end head :ok \`\`\` \]\]\]quot;request-id:{xRequestId}"); parts.Add(\[\[\[ \`\`\`php <?php $xSignature = $\_SERVER\['HTTP\_X\_SIGNATURE'\] ?? ''; $xRequestId = $\_SERVER\['HTTP\_X\_REQUEST\_ID'\] ?? ''; $dataID = strtolower($\_GET\['data\_id'\] ?? ''); // PHP converts dots in query param names to underscores $ts = null; $hash = null; foreach (explode(',', $xSignature) as $part) { $kv = explode('=', $part, 2); if (count($kv) !== 2) continue; $key = trim($kv\[0\]); $value = trim($kv\[1\]); if ($key === 'ts') $ts = $value; if ($key === 'v1') $hash = $value; } $parts = \[\]; if ($dataID !== '') $parts\[\] = "id:{$dataID}"; if ($xRequestId !== '') $parts\[\] = "request-id:{$xRequestId}"; $parts\[\] = "ts:{$ts}"; $manifest = implode(';', $parts) . ';'; $computed = hash\_hmac('sha256', $manifest, $secret); if (!hash\_equals($computed, $hash)) { http\_response\_code(401); exit; } http\_response\_code(200); \`\`\` \`\`\`javascript const xSignature = req.headers\['x-signature'\] ?? ''; const xRequestId = req.headers\['x-request-id'\] ?? ''; const dataId = (req.query\['data.id'\] ?? '').toLowerCase(); let ts, hash; for (const part of xSignature.split(',')) { const eq = part.indexOf('='); if (eq === -1) continue; const key = part.slice(0, eq).trim(); const val = part.slice(eq + 1).trim(); if (key === 'ts') ts = val; if (key === 'v1') hash = val; } const parts = \[\]; if (dataId) parts.push(\`id:${dataId}\`); if (xRequestId) parts.push(\`request-id:${xRequestId}\`); parts.push(\`ts:${ts}\`); const manifest = parts.join(';') + ';'; const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex'); if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))) { res.status(401).end(); return; } res.sendStatus(200); \`\`\` \`\`\`python import hashlib import hmac x\_signature = request.headers.get("x-signature", "") x\_request\_id = request.headers.get("x-request-id", "") data\_id = (request.args.get("data.id", "") or "").lower() ts = hash\_value = None for part in x\_signature.split(","): if "=" not in part: continue key, \_, value = part.partition("=") key = key.strip() value = value.strip() if key == "ts": ts = value if key == "v1": hash\_value = value parts = \[\] if data\_id: parts.append(f"id:{data\_id}") if x\_request\_id: parts.append(f"request-id:{x\_request\_id}") parts.append(f"ts:{ts}") manifest = ";".join(parts) + ";" computed = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest() if not hmac.compare\_digest(computed, hash\_value): return "", 401 return "", 200 \`\`\` \`\`\`go import ( "crypto/hmac" "crypto/sha256" "encoding/hex" "net/http" "strings" ) xSignature := r.Header.Get("x-signature") xRequestID := r.Header.Get("x-request-id") dataID := strings.ToLower(r.URL.Query().Get("data.id")) var ts, hash string for \_, part := range strings.Split(xSignature, ",") { kv := strings.SplitN(part, "=", 2) if len(kv) != 2 { continue } key := strings.TrimSpace(kv\[0\]) val := strings.TrimSpace(kv\[1\]) if key == "ts" { ts = val } if key == "v1" { hash = val } } var parts \[\]string if dataID != "" { parts = append(parts, "id:"+dataID) } if xRequestID != "" { parts = append(parts, "request-id:"+xRequestID) } parts = append(parts, "ts:"+ts) manifest := strings.Join(parts, ";") + ";" mac := hmac.New(sha256.New, \[\]byte(secret)) mac.Write(\[\]byte(manifest)) computed := hex.EncodeToString(mac.Sum(nil)) if !hmac.Equal(\[\]byte(computed), \[\]byte(hash)) { w.WriteHeader(http.StatusUnauthorized) return } w.WriteHeader(http.StatusOK) \`\`\` \`\`\`csharp using System.Security.Cryptography; using System.Text; var xSignature = Request.Headers\["x-signature"\].ToString(); var xRequestId = Request.Headers\["x-request-id"\].ToString(); var dataId = (Request.Query\["data.id"\].ToString() ?? "").ToLowerInvariant(); string ts = null, hash = null; foreach (var part in xSignature.Split(',')) { var eq = part.IndexOf('='); if (eq < 0) continue; var key = part\[..eq\].Trim(); var val = part\[(eq + 1)..\].Trim(); if (key == "ts") ts = val; if (key == "v1") hash = val; } var parts = new List(); if (!string.IsNullOrEmpty(dataId)) parts.Add($"id:{dataId}"); if (!string.IsNullOrEmpty(xRequestId)) parts.Add($"request-id:{xRequestId}"); parts.Add($"ts:{ts}"); var manifest = string.Join(";", parts) + ";"; using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(secret)); var computed = BitConverter .ToString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes(manifest))) .Replace("-", "").ToLowerInvariant(); if (!CryptographicOperations.FixedTimeEquals( Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash))) { return Unauthorized(); } return Ok(); \`\`\` \`\`\`java import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec; import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.util.ArrayList; import java.util.List; String xSignature = request.getHeader("x-signature") != null ? request.getHeader("x-signature") : ""; String xRequestId = request.getHeader("x-request-id") != null ? request.getHeader("x-request-id") : ""; String dataId = request.getParameter("data.id") != null ? request.getParameter("data.id").toLowerCase() : ""; String ts = null, hash = null; for (String part : xSignature.split(",")) { String\[\] kv = part.split("=", 2); if (kv.length != 2) continue; String key = kv\[0\].trim(); String val = kv\[1\].trim(); if ("ts".equals(key)) ts = val; if ("v1".equals(key)) hash = val; } List parts = new ArrayList<>(); if (!dataId.isEmpty()) parts.add("id:" + dataId); if (!xRequestId.isEmpty()) parts.add("request-id:" + xRequestId); parts.add("ts:" + ts); String manifest = String.join(";", parts) + ";"; Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF\_8), "HmacSHA256")); byte\[\] bytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF\_8)); StringBuilder sb = new StringBuilder(); for (byte b : bytes) sb.append(String.format("%02x", b & 0xff)); String computed = sb.toString(); if (!MessageDigest.isEqual( computed.getBytes(StandardCharsets.UTF\_8), hash.getBytes(StandardCharsets.UTF\_8))) { response.setStatus(401); return; } response.setStatus(200); \`\`\` \`\`\`ruby require 'openssl' x\_signature = request.headers\['x-signature'\] || '' x\_request\_id = request.headers\['x-request-id'\] || '' data\_id = (params\['data.id'\] || '').downcase ts = hash\_value = nil x\_signature.split(',').each do |part| key, value = part.split('=', 2) next unless key && value ts = value.strip if key.strip == 'ts' hash\_value = value.strip if key.strip == 'v1' end parts = \[\] parts << "id:#{data\_id}" unless data\_id.empty? parts << "request-id:#{x\_request\_id}" unless x\_request\_id.empty? parts << "ts:#{ts}" manifest = "#{parts.join(';')};" computed = OpenSSL::HMAC.hexdigest('SHA256', secret, manifest) unless OpenSSL.fixed\_length\_secure\_compare(computed, hash\_value) head :unauthorized return end head :ok \`\`\` \]\]\]quot;ts:{ts}"); var manifest = string.Join(";", parts) + ";"; using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(secret)); var computed = BitConverter .ToString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes(manifest))) .Replace("-", "").ToLowerInvariant(); if (!CryptographicOperations.FixedTimeEquals( Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash))) { return Unauthorized(); } return Ok(); Copiar

```
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

String xSignature = request.getHeader("x-signature") != null ? request.getHeader("x-signature") : "";
String xRequestId = request.getHeader("x-request-id") != null ? request.getHeader("x-request-id") : "";
String dataId = request.getParameter("data.id") != null
  ? request.getParameter("data.id").toLowerCase() : "";

String ts = null, hash = null;
for (String part : xSignature.split(",")) {
  String[] kv = part.split("=", 2);
  if (kv.length != 2) continue;
  String key = kv[0].trim();
  String val = kv[1].trim();
  if ("ts".equals(key)) ts = val;
  if ("v1".equals(key)) hash = val;
}

List<String> parts = new ArrayList<>();
if (!dataId.isEmpty()) parts.add("id:" + dataId);
if (!xRequestId.isEmpty()) parts.add("request-id:" + xRequestId);
parts.add("ts:" + ts);
String manifest = String.join(";", parts) + ";";

Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
byte[] bytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
StringBuilder sb = new StringBuilder();
for (byte b : bytes) sb.append(String.format("%02x", b & 0xff));
String computed = sb.toString();

if (!MessageDigest.isEqual(
  computed.getBytes(StandardCharsets.UTF_8),
  hash.getBytes(StandardCharsets.UTF_8)))
{
  response.setStatus(401);
  return;
}
response.setStatus(200);
```

Copiar

```
require 'openssl'

x_signature = request.headers['x-signature'] || ''
x_request_id = request.headers['x-request-id'] || ''
data_id = (params['data.id'] || '').downcase

ts = hash_value = nil
x_signature.split(',').each do |part|
  key, value = part.split('=', 2)
  next unless key && value
  ts = value.strip if key.strip == 'ts'
  hash_value = value.strip if key.strip == 'v1'
end

parts = []
parts << "id:#{data_id}" unless data_id.empty?
parts << "request-id:#{x_request_id}" unless x_request_id.empty?
parts << "ts:#{ts}"
manifest = "#{parts.join(';')};"

computed = OpenSSL::HMAC.hexdigest('SHA256', secret, manifest)
unless OpenSSL.fixed_length_secure_compare(computed, hash_value)
  head :unauthorized
  return
end
head :ok
```

Copiar

::: :::: ## Actions needed after receiving the notification When you receive a notification on your platform, Mercado Pago expects a response to validate that the reception was correct. To do this, return an \`HTTP STATUS 200\` or \`201\` within 22 seconds of receiving it. We recommend that you first respond with a \`200\` or \`201\`, and then process the notification on the server, to avoid duplicate notifications. If this response is not sent, the system will make new delivery attempts every 15 minutes. After the first failures, the interval progressively widens, but deliveries continue until the notification is confirmed. > WARNING > > Notifications from the \*\*Fraud alerts\*\* topic (\`stop\_delivery\_op\_wh\`) do not follow the usual retry logic. If you do not respond with \`HTTP 200\` or \`201\` upon receiving it, the notification is lost and you will not receive it again. Additionally, keep in mind: - Upon receiving a fraud alert, you must \*\*refund the payment without delivering the order\*\* by making a call to the \[Refunds API\](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/refund-order/post). - For chargeback management, see the \[documentation\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/chargebacks).
