# MD for: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/development-environment.md

\# Configure development environment To start your integration with Mercado Pago's payment solutions, it is necessary to prepare your development environment with a series of basic configurations that will allow you to access Mercado Pago's functionalities from the frontend securely. The development environment can be configured for integrations on \*\*websites\*\* or \*\*mobile applications\*\*. Select the type of integration below and follow the specific instructions for each case. :::::TabsComponent ::::TabComponent{title="Websites"} > CLIENT\_SIDE > > h2 > > Include the MercadoPago.js Library Use our official libraries to access Mercado Pago's functionalities from your frontend and securely capture the payment data.

- [html ](#editor%5F1)
- [node ](#editor%5F2)
  html node

```
<body>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</body>
```

Copiar

```
npm install @mercadopago/sdk-js
```

Copiar

\> CLIENT\_SIDE > > h2 > > Initialize Mercado Pago Library To initialize the Mercado Pago library, you will need to use your :toolTipComponent\[credentials\]{link="/developers/en/docs/checkout-api-orders/resources/credentials" linkText="Credentials" content="Unique access keys used to identify an integration in your account, linked to your application. For more information, access the link below."}, unique keys that identify an integration in your account. They are directly linked to the :toolTipComponent\[application\]{link="/developers/en/docs/checkout-api-orders/resources/application-details" linkText="Integration data" content="Entity registered in Mercado Pago that acts as an identifier for managing your integrations. For more information, access the link below."} you created for that integration, and will allow you to develop your project with Mercado Pago's best security measures. At this stage, you should use your :toolTipComponent\[test Public Key\]{content="Public key used in the frontend to access information and encrypt data. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Integration data > Tests > Test credentials\*."}. > NOTE > > If you are developing for someone else, you will be able to access the credentials of the applications you do not manage. Refer to \[Share credentials\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/resources/credentials#bookmark\_share\_credentials) for more information. Once you have located the :toolTipComponent\[test Public Key\]{content="Public key used in the frontend to access information and encrypt data, whether in the development or testing stage. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Application data > Tests > Test credentials\*."}, copy it and include it in the frontend to access the necessary data to interact with our services, as well as encrypt sensitive data involved in the payments you will receive.

- [html ](#editor%5F3)
- [javascript ](#editor%5F4)
  html javascript

```
<script>
  const mp = new MercadoPago("YOUR_PUBLIC_KEY");
</script>
```

Copiar

```
import { loadMercadoPago } from "@mercadopago/sdk-js";

await loadMercadoPago();
const mp = new window.MercadoPago("YOUR_PUBLIC_KEY");
```

Copiar

With these configurations, your development environment is already ready to continue with the specific configurations of your integration. :::: ::::TabComponent{title="Mobile applications"} Use Mercado Pago’s native SDK to simplify the card payment process securely in Android and iOS applications. Select the technology you are using and follow the steps to set up your development environment and start the payment flow. :::AccordionComponent{title="iOS"} Use the Mercado Pago native SDK to integrate payment methods into iOS applications. See below how to install and initialize the SDK. ### Install SDK Check below for the step-by-step instructions to install the SDK in your Swift project. 1\. In Swift Package Manager, click \*\*File > Add Packages\*\*. 2\. Paste the repository URL: \`https://github.com/mercadopago/sdk-ios\`. 3\. Select the desired SDK version. 4\. Click \*\*Add Package\*\* to complete the installation. ### Add dependencies Import the SDK dependencies into your project by running the following code: \`\`\` import CoreMethods \`\`\` ### Initialize SDK After installing the SDK and adding the dependencies to your project, initialize the SDK at the start of the application's lifecycle. This ensures that all essential settings are defined before any payment operation. > WARNING > > The SDK must be initialized only once when the application is launched. To ensure correct operation, call \`initialize()\` before using any other SDK functionality. To initialize the Mercado Pago library, you must use your :toolTipComponent\[credentials\]{link="/developers/en/docs/checkout-api-orders/resources/credentials" linkText="Credentials" content="Unique access keys that we use to identify an integration in your account, linked to your application. For more information, see the link below."}, unique keys that identify your integration and are linked to the :toolTipComponent\[application\]{link="/developers/en/docs/checkout-api-orders/resources/application-details" linkText="Integration data" content="Entity registered in Mercado Pago that acts as an identifier to manage your integrations. For more information, see the link below."} you created for that integration, allowing you to develop your project with Mercado Pago's best security measures. At this stage, you should use your :toolTipComponent\[test Public Key\]{content="Public key used on the frontend to access information. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Application data > Tests > Test credentials\*."}. > NOTE > > If you are developing for someone else, you can access the credentials of applications you do not manage. See \[Share credentials\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/resources/credentials#bookmark\_compartilhar\_credenciais) for more information. Copy the :toolTipComponent\[test Public Key\]{content="Public key used on the frontend to access information. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Application data > Tests > Test credentials\*."} and include it in the code below. The initialization process varies according to the technology used, either UIKit or SwiftUI.

- [swiftui ](#editor%5F6)
- [uikit ](#editor%5F5)
  uikit swiftui

```
import UIKit
import CoreMethods
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
  let configuration = MercadoPagoSDK.Configuration(
  publicKey: "YOUR-PUBLIC-KEY",
  country: // Enter the country of your public key
  )
  MercadoPagoSDK.shared.initialize(configuration)

  return true
  }
}
```

Copiar

```
import SwiftUI
import CoreMethods
@main
struct YourApp: App {
  init() {
  let configuration = MercadoPagoSDK.Configuration(
  publicKey: "<YOUR-PUBLIC-KEY>",
  country: "<Enter the country of your public key>",
  locale: "es-AR"
  )
  MercadoPagoSDK.shared.initialize(configuration)
  }

  var body: some Scene {
  WindowGroup {
  ContentView()
  }
  }
}
```

Copiar

The initialization parameters are listed in the table below. | Parameter | Type | Description | Required | | ------------ | ------- | --------------------------------------------------------------------------------------------- | -------------- | | \`public\_key\` | String | Public key used on the frontend to access information. You can access it through \*\*Your integrations > Integration data > Tests > Test credentials\*\*. | Required | | \`locale\` | String | Locale identifier (language and country). By default, the system's locale is used. | Optional | | \`country\` | \[Country\](https://mercadopago.github.io/sdk-ios/0.1.0/documentation/coremethods/mercadopagosdk/country) | \`Enum\` that identifies the country where \_Core Methods\_ will be processed. Use the country code corresponding to your Public Key. See the \[documentation\](https://mercadopago.github.io/sdk-ios/0.1.0/documentation/coremethods/mercadopagosdk/country/) for your country's code. | Required | With these configurations, your development environment is already ready to continue with the specific configurations of your integration. ::: :::AccordionComponent{title="Android"} Use the Mercado Pago native SDK to integrate payment methods into Android applications. See below how to configure the repository and initialize the SDK. ### Configure repository Add the Mercado Pago repository to your project's \`settings.build.gradle\` file in Kotlin, as shown below: \`\`\`kotlin pluginManagement { repositories { // Other dependencies... maven { url = uri("https://artifacts.mercadolibre.com/repository/android-releases") } } } dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL\_ON\_PROJECT\_REPOS) repositories { // Other dependencies... maven { url = uri("https://artifacts.mercadolibre.com/repository/android-releases") } } } \`\`\` ### Add dependencies Include the SDK dependencies in the \`build.gradle\` (or \`build.gradle.kts\`) file of your application's module: \`\`\`kotlin //Specify the SDK BOM with a version definition implementation(platform("com.mercadopago.android.sdk:sdk-android-bom:")) // Specify SDK library dependencies without a version definition implementation("com.mercadopago.android.sdk:core-methods") \`\`\` ### Initialize SDK After configuring the repository and adding the dependencies to your project, initialize the SDK at the start of the application's lifecycle. This ensures that all essential settings are defined before any payment operation. > WARNING > > The SDK must be initialized only once when the application is launched. To ensure correct operation, call \`initialize()\` before using any other SDK functionality. To initialize the Mercado Pago library, you must use your :toolTipComponent\[credentials\]{link="/developers/en/docs/checkout-api-orders/resources/credentials" linkText="Credentials" content="Unique access keys that we use to identify an integration in your account, linked to your application. For more information, see the link below."}, linked to the :toolTipComponent\[application\]{link="/developers/en/docs/checkout-api-orders/resources/application-details" linkText="Integration data" content="Entity registered in Mercado Pago that acts as an identifier to manage your integrations. For more information, see the link below."} you created. At this stage, you should use your :toolTipComponent\[test Public Key\]{content="Public key used on the frontend to access information. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Application data > Tests > Test credentials\*."}. > NOTE > > If you are developing for someone else, you can access the credentials of applications you do not manage. See \[Share credentials\](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/resources/credentials#bookmark\_compartilhar\_credenciais) for more information. Copy the :toolTipComponent\[test Public Key\]{content="Public key used on the frontend to access information. You can access it through \*Your integrations\* in the \*Integration data\* section, going to the \*Credentials\* section located on the right side of the screen and clicking \*Test\*. Alternatively, you can go through \*Your integrations > Application data > Tests > Test credentials\*."} and include it in the code below. Then, initialize the SDK in the \`Application\` class, as shown below: \`\`\`kotlin import android.app.Application import com.mercadopago.sdk.android.initializer.MercadoPagoSDK class MainApplication : Application() { override fun onCreate() { super.onCreate() MercadoPagoSDK.initialize( context = this, publicKey = "", countryCode = //CountryCode of this public key ) } } \`\`\` The initialization parameters are listed in the table below. | Parameter | Type | Description | Required | | ------------ | ------- | ------------------------------------------------------------------------------------------------- | -------------- | | \`context\` | \[Context\](https://developer.android.com/reference/android/content/Context) | Your application's context. | Required | | \`publicKey\` | String | Public key used on the frontend to access information. You can access it through \*\*Your integrations > Integration data > Tests > Test credentials\*\*. | Required | | \`countryCode\`| \[CountryCode\](https://mercadopago.github.io/sdk-android/sdk-android/com.mercadopago.sdk.android.domain.model/-country-code/index.html?query=enum%20CountryCode%20:%20Enum%3CCountryCode%3E) | \`Enum\` that identifies the country where \_Core Methods\_ will be processed. Use the country code corresponding to your Public Key. See the \[documentation\](https://mercadopago.github.io/sdk-ios/0.1.0/documentation/coremethods/mercadopagosdk/country/) for your country's code. | Required | With these configurations, your development environment is already ready to continue with the specific configurations of your integration. ::: :::: :::::
