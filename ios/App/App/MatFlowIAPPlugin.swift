import Capacitor
import Foundation
import StoreKit

@objc(MatFlowIAPPlugin)
public class MatFlowIAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MatFlowIAPPlugin"
    public let jsName = "MatFlowIAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Missing productId")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    resolve(call, ["status": "unavailable", "productId": productId])
                    return
                }

                var purchaseOptions: Set<Product.PurchaseOption> = []
                if let appAccountToken = call.getString("appAccountToken"),
                   let appAccountTokenUuid = UUID(uuidString: appAccountToken) {
                    purchaseOptions.insert(.appAccountToken(appAccountTokenUuid))
                }

                let result = try await product.purchase(options: purchaseOptions)
                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    await transaction.finish()
                    resolve(call, transactionPayload(transaction, status: "purchased", signedTransactionInfo: verification.jwsRepresentation))
                case .pending:
                    resolve(call, ["status": "pending", "productId": productId])
                case .userCancelled:
                    resolve(call, ["status": "cancelled", "productId": productId])
                @unknown default:
                    resolve(call, ["status": "unknown", "productId": productId])
                }
            } catch {
                reject(call, error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var entitlements: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    if let transaction = try? checkVerified(result) {
                        entitlements.append(transactionPayload(transaction, status: "restored", signedTransactionInfo: result.jwsRepresentation))
                    }
                }
                resolve(call, ["status": entitlements.isEmpty ? "empty" : "restored", "entitlements": entitlements])
            } catch {
                reject(call, error.localizedDescription)
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw NSError(domain: "MatFlowIAP", code: 1, userInfo: [NSLocalizedDescriptionKey: "StoreKit verification failed"])
        case .verified(let safe):
            return safe
        }
    }

    private func transactionPayload(_ transaction: Transaction, status: String, signedTransactionInfo: String? = nil) -> [String: Any] {
        let environment: String
        if #available(iOS 16.0, *) {
            environment = transaction.environment.rawValue
        } else {
            environment = "unknown"
        }

        var payload: [String: Any] = [
            "status": status,
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "environment": environment,
            "appAccountToken": transaction.appAccountToken?.uuidString as Any,
            "purchaseDate": isoDate(transaction.purchaseDate),
            "expirationDate": transaction.expirationDate.map(isoDate) as Any,
            "revocationDate": transaction.revocationDate.map(isoDate) as Any
        ]

        if let signedTransactionInfo = signedTransactionInfo {
            payload["signedTransactionInfo"] = signedTransactionInfo
        }

        return payload
    }

    private func isoDate(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func resolve(_ call: CAPPluginCall, _ data: [String: Any]) {
        DispatchQueue.main.async {
            call.resolve(data)
        }
    }

    private func reject(_ call: CAPPluginCall, _ message: String) {
        DispatchQueue.main.async {
            call.reject(message)
        }
    }
}
