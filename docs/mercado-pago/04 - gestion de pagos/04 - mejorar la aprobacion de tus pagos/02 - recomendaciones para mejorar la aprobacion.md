# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/payment-management/improve-payment-approval/recommendations.md

\# Recommendations to improve approval To \*\*prevent a legitimate payment from being rejected\*\* for not meeting security validations, you need to include as much information as possible when performing the operation and ensure your checkout has an optimized interface. Check out our \*\*recommendations to improve your approval rate\*\*. :::::AccordionComponent{title="Get and send the Device ID"} The \*\*Device ID\*\* is important information to ensure better security and, consequently, a better payment approval rate. It is a \*\*unique identifier for each buyer's device\*\* at the time of purchase. When a frequent buyer makes a purchase from a different device than usual, this might be seen as atypical behavior. Although it is not necessarily fraud, the Device ID helps us refine our evaluation and prevent us from rejecting legitimate payments. ::::TabsComponent :::TabComponent{title="Device ID in web applications"} To use Device ID on web and prevent possible fraudulent purchases, follow these steps: > WARNING > > If you're already using \[Mercado Pago's JS SDK\](https://www.mercadopago.com.ar/developers/en/docs/sdks-library/landing), you \*\*do not\*\* need to add the security script because the Device ID is obtained by default. In this case, go directly to the \[Use the Device ID step\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/additional-settings/improve-payment-approval/recommendations#bookmark\_3.\_use\_the\_device\_id). #### 1\. Add Mercado Pago's security script To implement Device ID generation on your site, add this script to your checkout page: \`\`\`html \`\`\` > NOTE > > You can add the Mercado Pago security script to any page on your site by replacing the \`view\` value with the name of the section where you want to add it, such as \`home\` or \`search\`, for example. This helps to enrich the information collected for generating the Device ID. #### 2\. Get the Device ID When you've added Mercado Pago's security script to your site, a Javascript global variable called \`MP\_DEVICE\_SESSION\_ID\` will be automatically created, containing the Device ID. If you prefer to use another variable, you can specify the name by adding the \`output\` attribute to the security script, like this: \`\`\`html \`\`\` You can also \*\*create your own variable\*\*. Just add an \`html\` tag to your site with the identifier \`id="deviceID"\`, like this: \`\`\`html \`\`\` #### 3\. Use the Device ID Once you have the Device ID value, you need to \*\*send it to our servers\*\* when creating a payment. It is very simple: just add this \`header\` to your request: \`\`\`html X-meli-session-id: device\_id \`\`\` > NOTE > > Do not forget to replace \`device\_id\` with the name of the variable where you stored your Device ID value. ::: :::TabComponent{title="Device ID in mobile applications"} If you have a native mobile application, you can capture device information with our SDK and send it when creating the \_token\_. Follow these steps: #### 1\. Add the dependency Based on your mobile application's operating system, add this dependency:

- [android ](#editor%5F2)
- [ios ](#editor%5F1)
  ios android

Put this code in the **Podfile** file.

```
use_frameworks!
pod 'MercadoPagoDevicesSDK'
```

Copiar

Add the repository and dependency to the **build.gradle** file.

```
repositories {
  maven {
  url "https://artifacts.mercadolibre.com/repository/android-releases"
  }
}
dependencies {
  implementation 'com.mercadolibre.android.device:sdk:4.0.1'
}
```

Copiar

\#### 2\. Initialize the module After adding the dependency, initialize the module using one of these languages:

- [java ](#editor%5F5)
- [objective-c ](#editor%5F4)
- [swift ](#editor%5F3)
  swift objective-c java

We recommend initializing the **AppDelegate** in the **didFinishLaunchingWithOptions** event.

```
import MercadoPagoDevicesSDK
...
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
  ...
  MercadoPagoDevicesSDK.shared.execute()
  ...
}
```

Copiar

We recommend initializing the **AppDelegate** in the **didFinishLaunchingWithOptions** event.

```
@import 'MercadoPagoDevicesSDK';
...
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  ...
  [[MercadoPagoDevicesSDK shared] execute];
  ...
}
```

Copiar

We recommend initializing in the **MainApplication** class.

```
import com.mercadolibre.android.device.sdk.DeviceSDK;
DeviceSDK.getInstance().execute(this);
```

Copiar

\#### 3\. Capture the information Use any of these functions to get the information in the format you need:

- [java ](#editor%5F8)
- [objective-c ](#editor%5F7)
- [swift ](#editor%5F6)
  swift objective-c java

```
MercadoPagoDevicesSDK.shared.getInfo() // Returns a Device object that is Codable
MercadoPagoDevicesSDK.shared.getInfoAsJson() // Returns an object in JSON
MercadoPagoDevicesSDK.shared.getInfoAsJsonString() // Returns the JSON in String format
MercadoPagoDevicesSDK.shared.getInfoAsDictionary() // Returns a Dictionary<String,Any> object
```

Copiar

```
[[[MercadoPagoDevicesSDK] shared] getInfoAsJson] // Returns an object in JSON
[[[MercadoPagoDevicesSDK] shared] getInfoAsJsonString] // Returns the JSON in String format
[[[MercadoPagoDevicesSDK] shared] getInfoAsDictionary] // Returns a Dictionary<String,Any> object
```

Copiar

```
Device device = DeviceSDK.getInstance().getInfo() // Returns a Device object that is serializable
Map deviceMap = DeviceSDK.getInstance().getInfoAsMap() // Returns a Map<String, Object>
String jsonString = DeviceSDK.getInstance().getInfoAsJsonString() // Returns a String in JSON format
```

Copiar

\#### 4\. Send the information Finally, send the information you obtained in the \`device\` field when creating the \`card\_token\`. \`\`\` { ..., "device":{ "fingerprint":{ "os":"iOS", "system\_version":"8.3", "ram":18446744071562067968, "disk\_space":498876809216, "model":"MacBookPro9,2", "free\_disk\_space":328918237184, "vendor\_ids":\[ { "name":"vendor\_id", "value":"C2508642-79CF-44E4-A205-284A4F4DE04C" }, { "name":"uuid", "value":"AB28738B-8DC2-4EC2-B514-3ACF330482B6" } \], "vendor\_specific\_attributes":{ "feature\_flash":false, "can\_make\_phone\_calls":false, "can\_send\_sms":false, "video\_camera\_available":true, "cpu\_count":4, "simulator":true, "device\_languaje":"en", "device\_idiom":"Phone", "platform":"x86\_64", "device\_name":"iPhone Simulator", "device\_family":4, "retina\_display\_capable":true, "feature\_camera":false, "device\_model":"iPhone Simulator", "feature\_front\_camera":false }, "resolution":"375x667" } } \`\`\` ::: :::: ::::: :::AccordionComponent{title="Include all payment data"} To optimize payment security validation and improve approvals, it is important to \*\*send as much data as possible about the buyer and the product\*\*. Take a look at all the attributes you can send when :TagComponent{tag="API" text="creating an order" href="/developers/en/reference/online-payments/checkout-api/create-order/post"}, especially the additional information (\`additional\_info\`), such as \*\*buyer data\*\*, \*\*product details\*\*, and \*\*shipping information\*\*. There are also \*\*extra fields\*\* you can send based on \*\*your business sector\*\*. You can see more details about each sector and the data we recommend including in the \[Industry data\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/improve-payment-approval/industry-data) documentation. ::: :::AccordionComponent{title="Improve the user experience"} Sometimes buyers can make mistakes when filling in their information at checkout. That's why it is good to review each step, the interactions, and even the design, to make sure everything is as clear as possible. If a payment is rejected, it is important to explain to your customers why it was rejected and what they can do to fix it. This way, they'll have all the information they need to pay without problems. :::
