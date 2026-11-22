import UIKit
import AVFoundation
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        watch?.invalidate(); watch = nil
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // 다른 앱(음악, 유튜브)의 소리가 흐르는지 앞으로 오는 순간에 보고 게임 쪽(src/audio/index.js)에 알린다.
        // 흐르고 있으면 게임은 소리 종류를 '배경'으로 바꿔 다른 소리를 끊지 않고 섞는다.
        // 예전엔 앞으로 올 때 한 번 본 값을 붙들고 있어서, 켤 때 잠깐 다른 소리가 있었거나 값이 잘못 잡히면 게임 내내 음악이 꺼진 채였다.
        // 이제는 앞에 있는 동안 몇 초마다 다시 보고, 다른 소리가 멈추면 곧바로 게임 음악이 돌아온다. (34단계, 동원 "킬 때부터 안 나")
        tellWeb()
        for d in [0.8, 2.0, 4.0] { DispatchQueue.main.asyncAfter(deadline: .now() + d) { self.tellWeb() } }
        watch?.invalidate()
        watch = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in self?.tellWeb() }
    }

    private var watch: Timer?
    private func tellWeb() {
        guard let vc = window?.rootViewController as? CAPBridgeViewController, let web = vc.bridge?.webView else { return }
        let otherAudio = AVAudioSession.sharedInstance().isOtherAudioPlaying
        web.evaluateJavaScript("window.__flOther=\(otherAudio);window.dispatchEvent(new Event('fl-other-audio'))", completionHandler: nil)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
