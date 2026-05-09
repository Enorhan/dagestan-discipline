import AuthenticationServices
import Capacitor
import Foundation

@objc(MatFlowSIWAPlugin)
public class MatFlowSIWAPlugin: NSObject, CAPBridgedPlugin {
    public let identifier = "MatFlowSIWAPlugin"
    public let jsName = "MatFlowSIWA"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var contextProvider: PresentationContextProvider?

    @objc func authorize(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("Missing nonce")
            return
        }

        let scopesValue = call.getString("scopes") ?? "email name"
        let request = ASAuthorizationAppleIDProvider().createRequest()
        var scopes: [ASAuthorization.Scope] = []
        if scopesValue.contains("email") { scopes.append(.email) }
        if scopesValue.contains("name") { scopes.append(.fullName) }
        request.requestedScopes = scopes
        request.nonce = nonce
        if let state = call.getString("state") { request.state = state }

        let controller = ASAuthorizationController(authorizationRequests: [request])
        let provider = PresentationContextProvider()
        controller.delegate = self
        controller.presentationContextProvider = provider

        pendingCall = call
        contextProvider = provider
        DispatchQueue.main.async {
            controller.performRequests()
        }
    }

    private func resolvePendingCall(_ payload: [String: Any]) {
        pendingCall?.resolve(payload)
        pendingCall = nil
        contextProvider = nil
    }

    private func rejectPendingCall(_ message: String, code: String? = nil) {
        pendingCall?.reject(message, code)
        pendingCall = nil
        contextProvider = nil
    }
}

extension MatFlowSIWAPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = credential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            rejectPendingCall("Apple did not return an identity token")
            return
        }

        var payload: [String: Any] = [
            "user": credential.user,
            "identityToken": identityToken
        ]
        if let codeData = credential.authorizationCode,
           let code = String(data: codeData, encoding: .utf8) {
            payload["authorizationCode"] = code
        }
        if let email = credential.email { payload["email"] = email }
        if let givenName = credential.fullName?.givenName { payload["givenName"] = givenName }
        if let familyName = credential.fullName?.familyName { payload["familyName"] = familyName }
        if let state = credential.state { payload["state"] = state }

        resolvePendingCall(payload)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain,
           let code = ASAuthorizationError.Code(rawValue: nsError.code) {
            switch code {
            case .canceled:
                rejectPendingCall("Apple sign-in was cancelled", code: "CANCELLED")
                return
            case .unknown, .invalidResponse, .notHandled, .failed, .notInteractive:
                rejectPendingCall(nsError.localizedDescription, code: "FAILED")
                return
            @unknown default:
                break
            }
        }
        rejectPendingCall(nsError.localizedDescription)
    }
}

private final class PresentationContextProvider: NSObject, ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if #available(iOS 15.0, *) {
            let scenes = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
            for scene in scenes {
                if let window = scene.keyWindow ?? scene.windows.first {
                    return window
                }
            }
        }
        if let window = UIApplication.shared.windows.first {
            return window
        }
        return ASPresentationAnchor()
    }
}

