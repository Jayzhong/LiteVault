# Logging Guidelines

## What to log
- lifecycle milestones and feature entry/exit
- intent handling and use case boundaries
- network metadata (method, path, status, latency, trace id)
- recoverable errors and unexpected failures
- performance timings for key operations

Note: avoid logging inside reducers; log at intent handling or use case boundaries.

## What NOT to log
- raw user content (notes, text, drafts, raw_text)
- verification codes / OTPs
- tokens, cookies, Authorization headers
- full email addresses
- request or response bodies

## Tag conventions
- FeatureName (Login, Home, Settings)
- Network
- Auth
- DB
- MVI

## Redaction rules
- Authorization/Cookie headers are replaced with [REDACTED]
- bearer/JWT tokens are replaced with [REDACTED]
- OTP/verification codes are replaced with [REDACTED_CODE]
- emails are masked to a***@domain.com
- raw_text values are replaced with [REDACTED_TEXT len=...]

## Release policy
- Release builds log only warn/error
- Debug builds allow debug/info/warn/error

## Usage demos

### KMP (commonMain) UseCase / ViewModel
```kotlin
class SendCodeUseCase(
    private val logger: Logger
) {
    suspend operator fun invoke(email: String) {
        logger.info("Auth", "action=send_code status=attempt")
    }
}
```

### Compose Screen (commonMain)
```kotlin
@Composable
fun LoginScreen(
    logger: Logger = koinInject()
) {
    LaunchedEffect(Unit) {
        logger.info("Login", "screen=login event=enter")
    }
}
```

### Android (androidMain)
```kotlin
class AndroidOnlyHelper(private val logger: Logger) {
    fun onStart() {
        logger.debug("Android", "action=on_start")
    }
}
```

### iOS Kotlin (iosMain)
```kotlin
class IosOnlyHelper(private val logger: Logger) {
    fun onAppear() {
        logger.info("iOS", "action=on_appear")
    }
}
```

### Swift (via Kotlin bridge)
```swift
import ComposeApp

SwiftLoggerBridge.shared.info(tag: "Auth", message: "action=send_code status=attempt")
SwiftLoggerBridge.shared.event(name: "auth_flow")
SwiftLoggerBridge.shared.eventWithAttributes(
    name: "auth_flow",
    attributes: ["step": "verify_code"]
)
```

Note: ensure Koin and logging are initialized before calling the Swift bridge (MainViewController already does this).
