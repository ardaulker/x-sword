import Capacitor
import CoreHaptics
import GameKit
import UIKit

/// The phone side of `app/src/game/platform.ts`: Game Center sign-in and saved games, and vibration rhythms.
/// Every method answers a JS promise; the web code treats a rejection as "use the guest profile / do nothing".
@objc(XSwordGamesPlugin)
public class XSwordGamesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "XSwordGamesPlugin"
    public let jsName = "XSwordGames"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
    ]

    private static let saveName = "xsword-progress"

    // MARK: Game Center

    @objc func signIn(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        var settled = false
        let finish: (Error?) -> Void = { error in
            if settled { return }
            if player.isAuthenticated {
                settled = true
                call.resolve(["provider": "gamecenter", "playerId": player.gamePlayerID, "displayName": player.alias])
            } else if let error = error {
                settled = true
                call.reject(error.localizedDescription)
            }
        }
        if player.isAuthenticated { finish(nil); return }
        // The handler runs again after the player has used the system sign-in sheet.
        player.authenticateHandler = { [weak self] controller, error in
            if let controller = controller {
                DispatchQueue.main.async { self?.bridge?.viewController?.present(controller, animated: true) }
                return
            }
            if error == nil && !player.isAuthenticated { settled = true; call.reject("Game Center sign-in was not completed"); return }
            finish(error)
        }
    }

    /// Progress lives in one Game Center saved game (it needs the iCloud capability on the app; see docs/ios-app.md).
    @objc func loadSnapshot(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        guard player.isAuthenticated else { call.reject("Not signed in to Game Center"); return }
        player.fetchSavedGames { games, error in
            if let error = error { call.reject(error.localizedDescription); return }
            guard let game = games?.filter({ $0.name == Self.saveName }).max(by: { ($0.modificationDate ?? .distantPast) < ($1.modificationDate ?? .distantPast) }) else {
                call.resolve(["data": NSNull()])
                return
            }
            game.loadData { data, error in
                if let error = error { call.reject(error.localizedDescription); return }
                call.resolve(["data": data.flatMap { String(data: $0, encoding: .utf8) } ?? NSNull()])
            }
        }
    }

    @objc func saveSnapshot(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        guard player.isAuthenticated else { call.reject("Not signed in to Game Center"); return }
        guard let text = call.getString("data"), let data = text.data(using: .utf8) else { call.reject("No data"); return }
        player.saveGameData(data, withName: Self.saveName) { _, error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
        }
    }

    // MARK: Haptics

    private var engine: CHHapticEngine?

    private func hapticEngine() -> CHHapticEngine? {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return nil }
        if let engine = engine { return engine }
        guard let made = try? CHHapticEngine() else { return nil }
        made.isAutoShutdownEnabled = true
        made.resetHandler = { [weak self] in try? self?.engine?.start() }
        self.engine = made
        return made
    }

    /// `pattern` is the same list as `navigator.vibrate`: vibrate, pause, vibrate, pause ... in milliseconds.
    @objc func haptic(_ call: CAPPluginCall) {
        let raw = (call.options["pattern"] as? [Any]) ?? []
        let pattern = raw.compactMap { ($0 as? NSNumber)?.doubleValue }.prefix(24).map { max(0, $0) / 1000 }
        if pattern.isEmpty { call.resolve(); return }

        var events: [CHHapticEvent] = []
        var cursor = 0.0
        for (i, seconds) in pattern.enumerated() {
            if i % 2 == 0 {
                if seconds < 0.04 {
                    events.append(CHHapticEvent(eventType: .hapticTransient, parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.6),
                    ], relativeTime: cursor))
                } else {
                    events.append(CHHapticEvent(eventType: .hapticContinuous, parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5),
                    ], relativeTime: cursor, duration: seconds))
                }
            }
            cursor += seconds
        }

        if let engine = hapticEngine() {
            do {
                try engine.start()
                let player = try engine.makePlayer(with: CHHapticPattern(events: events, parameters: []))
                try player.start(atTime: CHHapticTimeImmediate)
            } catch {
                call.reject(error.localizedDescription); return
            }
        } else {
            // No Core Haptics (older phones, the simulator): one tap per vibrate step.
            let generator = UIImpactFeedbackGenerator(style: .medium)
            var at = 0.0
            for (i, seconds) in pattern.enumerated() {
                if i % 2 == 0 { DispatchQueue.main.asyncAfter(deadline: .now() + at) { generator.impactOccurred() } }
                at += seconds
            }
        }
        call.resolve()
    }
}
