# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/notifications.md

\# Configure notifications \*\*Webhooks\*\* notifications, also known as \*\*web callbacks\*\*, are an effective method that allows Mercado Pago servers to send information in \*\*real time\*\* when a specific event related to your integration occurs. Instead of your system constantly querying for updates, Webhooks allow the passive and automatic transmission of data between Mercado Pago and your integration through an \*\*HTTPS POST\*\* request, optimizing communication and reducing server load. ## Configure Webhooks Below, we present a step-by-step guide to receiving payment notifications in integrations with Checkout API . Once configured, Webhook notifications will be sent whenever any update occurs on the reported topic, including the creation and update of orders and transaction processing. 1\. Go to \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app) and select the application integrated with Checkout API for which you want to activate notifications. !\[cofigure notifications\](https://www.mercadopago.com.ar/images/api-orders/not1-app-es-v1.png) 2\. In the left menu, select \*\*Webhooks > Configure notifications\*\*. !\[cofigure notifications\](https://www.mercadopago.com.ar/images/api-orders/not2-configure-es-v1.png) 3\. Select the \*\*Production mode\*\* tab and provide an \`HTTPS URL\` to receive notifications with your productive integration. !\[configure notifications\](https://www.mercadopago.com.ar/images/api-orders/not3-url-es-v2.png) > NOTE > > If you need to identify multiple accounts, add the parameter \`?client=(sellername)\` to the end of the indicated URL to identify the sellers. 4\. Select the \*\*Order (Mercado Pago)\*\* event to receive notifications, which will be sent in \`JSON\` format via an \`HTTPS POST\` to the URL specified above. !\[configure notifications\](https://www.mercadopago.com.ar/images/api-orders/not4-order-es-v2.png) 5\. Finally, click on \*\*Save configuration\*\*. This will generate an exclusive secret key for the application, which will allow you to validate the authenticity of the received notifications, ensuring that they were sent by Mercado Pago. Keep in mind that this generated key does not have an expiration date and its periodic renewal is not mandatory, although it is recommended. To do this, simply click the \*\*Reset\*\* button. ## Simulate receiving the notification To ensure that notifications are configured correctly, it is necessary to simulate their reception. To do this, follow the steps below. 1\. After configuring your Webhooks, click \*\*Simulate notification\*\*. 2\. On the simulation screen, select the URL to be tested. 3\. Next, choose the \*\*event type\*\* and enter the \*\*ID\*\* that will be sent in the notification body (\`Data ID\`). !\[cofigure notifications\](https://www.mercadopago.com.ar/images/api-orders/not5-order-es-v2.png) 4\. Finally, click on \*\*Send test\*\* to verify the request, the response provided by the server, and the event description. You will receive a response as shown in the example below, representing the \_body\_ of the notification received on your server. \`\`\`json { "action": "order.action\_required", "api\_version": "v1", "application\_id": "76506430185983", "date\_created": "2021-11-01T02:02:02Z", "id": "123456", "live\_mode": false, "type": "order", "user\_id": 2025701502, "data": { "id": "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3" } } \`\`\` > WARNING > > If for any reason you are not receiving Mercado Pago notifications, you can alternatively get information about the resource that was not notified by sending a GET to the endpoint :TagComponent{tag="API" text="/v1/orders/{id}" href="/developers/en/reference/online-payments/checkout-api/get-order/get"}. The use of this method is not recommended, so we additionally suggest contacting \[Support\](https://www.mercadopago.com.ar/developers/en/support). ## Validate the origin of the notification Validating the origin of a notification is essential to ensure the security and authenticity of the received information. This process helps prevent fraud and ensures that only legitimate notifications are processed. Mercado Pago will send a notification similar to the example below for a \`order\` topic alert. This example includes the complete notification, which contains the query params, the body, and the header of the notification. - \*\*Query params\*\*: These are query parameters that accompany the URL. In the example, we have \`data.id=ORD01JQ4S4KY8HWQ6NA5PXB65B3D3\` and \`type=order\`. - \*\*Body\*\*: The body of the notification contains detailed information about the event, such as \`action\`, \`api\_version\`, \`application\_id\`, \`date\_created\`, \`id\`, \`live\_mode\`, \`type\`, \`user\_id\`, and \`data\`. - \*\*Header\*\*: The header contains important metadata, including the secret signature of the notification \`x-signature\`. \`\`\`notification POST /test?data.id=ORD01JQ4S4KY8HWQ6NA5PXB65B3D3&type=order HTTP/1.1 Host: test.requestcatcher.com Accept: \*/\* Accept-Encoding: \* Connection: keep-alive Content-Length: 177 Content-Type: application/json Newrelic: eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkFwcCIsImFjIjoiOTg5NTg2IiwiYXAiOiI5NjA2MzYwOTQiLCJ0eCI6ImY4MzljZjg4ODg2MGRmZTIiLCJ0ciI6ImMwOGMwZGMyMjNjZDY2YjJkZWQwMjUxZmYxNWNiNGQ1IiwicHIiOjEuMjUwMzIsInNhIjp0cnVlLCJ0aSI6MTc0Mjg0MjU4MDE2NCwiaWQiOiIxOGI2NDcxNjNkNzI3NjU4IiwidGsiOiIxNzA5NzA3In19= Traceparent: 00-c08c0dc223cd66b2ded0251ff15cb4d5-18b647163d727658-01 Tracestate: 1709707@nr=0-0-989586-960636094-18b647163d727658-f839cf888860dfe2-1-1.250320-1742842580164 User-Agent: restclient-node/4.15.3 X-Request-Id: 2066ca19-c6f1-498a-be75-1923005edd06 X-Rest-Pool-Name: /services/webhooks.js X-Retry: 0 X-Signature: ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b X-Socket-Timeout: 22000 {"action":"order.action\_required","api\_version":"v1","application\_id":"76506430185983","date\_created":"2021-11-01T02:02:02Z","id":"123456","live\_mode":false,"type":"order","user\_id":2025701502,"data":{"id":"ORD01JQ4S4KY8HWQ6NA5PXB65B3D3"}} \`\`\` From the received Webhook notification, you can validate the authenticity of its origin. Mercado Pago will always include the secret key in the Webhooks notifications to be received, which will allow validating their authenticity. This key will be sent in the \`x-signature\` header, similar to the example below. \`\`\` ts=1742505638683,v1=ced36ab6d33566bb1e16c125819b8d840d6b8ef136b0b9127c76064466f5229b \`\`\` To confirm the validation, it is necessary to extract the key from the \_header\_ and compare it with the key provided for your application in \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app). Follow one of the approaches below to validate the authenticity of the notification. ::::TabsComponent :::TabComponent{title="With SDKs"} The official SDK implements HMAC-based Webhook Signature Verification to authenticate the origin of each received notification. To get your secret key (\`secret\`), select the application in \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app), click \*\*Webhooks > Configure notification\*\*, and reveal the generated key.

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
  request.headers.get(“x-signature”),
  request.headers.get(“x-request-id”),
  request.args.get(“data.id”),
  secret,
  )
  return “”, 200
except InvalidWebhookSignatureError:
  return “”, 401
```

Copiar

```
import “github.com/mercadopago/sdk-go/pkg/webhook”

err := webhook.ValidateSignature(
  r.Header.Get(“x-signature”),
  r.Header.Get(“x-request-id”),
  r.URL.Query().Get(“data.id”),
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
  xSignature: Request.Headers[“x-signature”],
  xRequestId: Request.Headers[“x-request-id”],
  dataId: Request.Query[“data.id”],
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
  request.getHeader(“x-signature”),
  request.getHeader(“x-request-id”),
  request.getParameter(“data.id”),
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

::: :::TabComponent{title="Without SDKs"} 1\. To extract the \_timestamp\_ (\`ts\`) and key (\`v1\`) from the \`x-signature\` \_header\_, divide the \_header\_ content by the \`,\` character, which will result in a list of elements. The value for the \`ts\` prefix is the notification \_timestamp\_ (in milliseconds) and \`v1\` is the encrypted key. 2\. Using the \_template\_ below, substitute the parameters with the data received in your notification. \`\`\` id:\[data.id\_url\];request-id:\[x-request-id\_header\];ts:\[ts\_header\]; \`\`\` - \`\[data.id\_url\]\` will be replaced by the value of the \`data.id\` parameter received in the URL \_query params\_. > NOTE > > If \`data.id\` is returned with uppercase alphanumeric characters, convert it to lowercase before using it in the manifest. For example, \`ORD01JQ4S4KY8HWQ6NA5PXB65B3D3\` should be used as \`ord01jq4s4ky8hwq6na5pxb65b3d3\`. - \`\[x-request-id\_header\]\` must be replaced by the value received in the \`x-request-id\` \_header\_. - \`\[ts\_header\]\` will be the \`ts\` value extracted from the \`x-signature\` \_header\_. > NOTE > > If any of the values (\`data.id\`, \`x-request-id\`) are not present in the received notification, you must remove them from the manifest before computing the \`HMAC\`. 3\. In \[Your integrations\](https://www.mercadopago.com.ar/developers/panel/app), select the integrated application, click \*\*Webhooks > Configure notification\*\* and reveal the generated secret key. !\[cofigure notifications\](https://www.mercadopago.com.ar/images/api-orders/not6-signature-es-v1.png) 4\. Generate the counter-key for validation. To do this, compute an \[HMAC\](https://en.wikipedia.org/wiki/HMAC) with the \`SHA256 hash\` function in hexadecimal base, using the secret key as the key and the \_template\_ with the values as the message.

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
if ($dataID !== '') $parts[] = “id:{$dataID}”;
if ($xRequestId !== '') $parts[] = “request-id:{$xRequestId}”;
$parts[] = “ts:{$ts}”;
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

x_signature = request.headers.get(“x-signature”, “”)
x_request_id = request.headers.get(“x-request-id”, “”)
data_id = (request.args.get(“data.id”, “”) or “”).lower()

ts = hash_value = None
for part in x_signature.split(“,”):
  if “=” not in part:
  continue
  key, _, value = part.partition(“=”)
  key = key.strip()
  value = value.strip()
  if key == “ts”: ts = value
  if key == “v1”: hash_value = value

parts = []
if data_id: parts.append(f”id:{data_id}”)
if x_request_id: parts.append(f”request-id:{x_request_id}”)
parts.append(f”ts:{ts}”)
manifest = “;”.join(parts) + “;”

computed = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
if not hmac.compare_digest(computed, hash_value):
  return “”, 401
return “”, 200
```

Copiar

```
import (
  “crypto/hmac”
  “crypto/sha256”
  “encoding/hex”
  “net/http”
  “strings”
)

xSignature := r.Header.Get(“x-signature”)
xRequestID := r.Header.Get(“x-request-id”)
dataID := strings.ToLower(r.URL.Query().Get(“data.id”))

var ts, hash string
for _, part := range strings.Split(xSignature, “,”) {
  kv := strings.SplitN(part, “=”, 2)
  if len(kv) != 2 { continue }
  key := strings.TrimSpace(kv[0])
  val := strings.TrimSpace(kv[1])
  if key == “ts” { ts = val }
  if key == “v1” { hash = val }
}

var parts []string
if dataID != “” { parts = append(parts, “id:”+dataID) }
if xRequestID != “” { parts = append(parts, “request-id:”+xRequestID) }
parts = append(parts, “ts:”+ts)
manifest := strings.Join(parts, “;”) + “;”

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

```
using System.Security.Cryptography;
using System.Text;

var xSignature = Request.Headers[“x-signature”].ToString();
var xRequestId = Request.Headers[“x-request-id”].ToString();
var dataId = (Request.Query[“data.id”].ToString() ?? “”).ToLowerInvariant();

string ts = null, hash = null;
foreach (var part in xSignature.Split(','))
{
  var eq = part.IndexOf('=');
  if (eq < 0) continue;
  var key = part[..eq].Trim();
  var val = part[(eq + 1)..].Trim();
  if (key == “ts”) ts = val;
  if (key == “v1”) hash = val;
}

var parts = new List<string>();
if (!string.IsNullOrEmpty(dataId)) parts.Add($”id:{dataId}”);
if (!string.IsNullOrEmpty(xRequestId)) parts.Add($”request-id:{xRequestId}”);
parts.Add($”ts:{ts}”);
var manifest = string.Join(“;”, parts) + “;”;

using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var computed = BitConverter
  .ToString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes(manifest)))
  .Replace(“-”, “”).ToLowerInvariant();

if (!CryptographicOperations.FixedTimeEquals(
  Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash)))
{
  return Unauthorized();
}
return Ok();
```

Copiar

```
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

String xSignature = request.getHeader(“x-signature”) != null ? request.getHeader(“x-signature”) : “”;
String xRequestId = request.getHeader(“x-request-id”) != null ? request.getHeader(“x-request-id”) : “”;
String dataId = request.getParameter(“data.id”) != null
  ? request.getParameter(“data.id”).toLowerCase() : “”;

String ts = null, hash = null;
for (String part : xSignature.split(“,”)) {
  String[] kv = part.split(“=”, 2);
  if (kv.length != 2) continue;
  String key = kv[0].trim();
  String val = kv[1].trim();
  if (“ts”.equals(key)) ts = val;
  if (“v1”.equals(key)) hash = val;
}

List<String> parts = new ArrayList<>();
if (!dataId.isEmpty()) parts.add(“id:” + dataId);
if (!xRequestId.isEmpty()) parts.add(“request-id:” + xRequestId);
parts.add(“ts:” + ts);
String manifest = String.join(“;”, parts) + “;”;

Mac mac = Mac.getInstance(“HmacSHA256”);
mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), “HmacSHA256”));
byte[] bytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
StringBuilder sb = new StringBuilder();
for (byte b : bytes) sb.append(String.format(“%02x”, b & 0xff));
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
parts << “id:#{data_id}” unless data_id.empty?
parts << “request-id:#{x_request_id}” unless x_request_id.empty?
parts << “ts:#{ts}”
manifest = “#{parts.join(';')};”

computed = OpenSSL::HMAC.hexdigest('SHA256', secret, manifest)
unless OpenSSL.fixed_length_secure_compare(computed, hash_value)
  head :unauthorized
  return
end
head :ok
```

Copiar

::: :::: ## Actions required after receiving the notification When you receive a notification on your platform, Mercado Pago expects a response to validate that the reception was correct. To do this, you must return an \`HTTP STATUS 200 (OK)\` or \`201 (CREATED)\`. The waiting time for this confirmation will be 22 seconds. If this response is not sent, the system will understand that the notification was not received and will make a new attempt to send it every 15 minutes until it receives the response. After the third attempt, the deadline will be extended, but the deliveries will continue to happen. After responding to the notification, confirming its receipt, you can get all the information about the notified resource by sending a \*\*GET\*\* to the endpoint :TagComponent{tag="API" text="/v1/orders/{id}" href="/developers/en/reference/online-payments/checkout-api/get-order/get"}. With this information, you will be able to make the necessary updates to your platform, such as updating an approved payment.
