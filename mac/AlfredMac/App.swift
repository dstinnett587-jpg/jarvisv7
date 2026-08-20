import SwiftUI
import AppKit
import WebKit
import Speech
import AVFoundation

private let serverBase = URL(string: "https://jarvisv7-git-jarvis-repair-n-8501.vercel.app")!

@main
struct AlfredMacApp: App {
    @StateObject private var alfred = AlfredController()

    var body: some Scene {
        WindowGroup {
            AlfredFaceView(controller: alfred)
                .frame(minWidth: 720, minHeight: 620)
                .background(Color.black)
                .onAppear { alfred.start() }
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
    }
}

struct AlfredFaceView: NSViewRepresentable {
    @ObservedObject var controller: AlfredController

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        let view = WKWebView(frame: .zero, configuration: config)
        view.setValue(false, forKey: "drawsBackground")
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: serverBase))
        return view
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        let state = controller.visualState
        let js = "document.getElementById('stage')?.classList.remove('listening','thinking','speaking'); document.getElementById('stage')?.classList.add('\\(state)');"
        nsView.evaluateJavaScript(js)
    }

    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator: NSObject, WKNavigationDelegate { }
}

@MainActor
final class AlfredController: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published var visualState = "listening"

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var player: AVAudioPlayer?
    private var history: [[String:String]] = []
    private var conversationOpenUntil = Date.distantPast
    private var started = false

    func start() {
        guard !started else { return }
        started = true
        SFSpeechRecognizer.requestAuthorization { [weak self] auth in
            guard auth == .authorized else { return }
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                guard granted else { return }
                Task { @MainActor in self?.beginListening() }
            }
        }
    }

    private func beginListening() {
        stopRecognition()
        visualState = "listening"

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
        } catch {
            return
        }

        recognitionTask = speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                Task { @MainActor in self.handleTranscript(text, final: result.isFinal) }
            }
            if error != nil {
                Task { @MainActor in
                    self.stopRecognition()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { self.beginListening() }
                }
            }
        }
    }

    private func handleTranscript(_ text: String, final: Bool) {
        let lower = text.lowercased()
        let isConversation = Date() < conversationOpenUntil

        if let range = lower.range(of: "alfred") {
            let after = String(text[range.upperBound...])
                .trimmingCharacters(in: CharacterSet(charactersIn: " ,.:;-"))
            if after.isEmpty {
                conversationOpenUntil = Date().addingTimeInterval(20)
                stopRecognition()
                speak("At your service.")
            } else if final || after.count > 3 {
                ask(after)
            }
            return
        }

        if isConversation && final && !text.isEmpty {
            ask(text)
        }
    }

    private func ask(_ text: String) {
        stopRecognition()
        visualState = "thinking"

        let endpoint = serverBase.appendingPathComponent("api/chat")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String:Any] = ["message": text, "history": Array(history.suffix(8))]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            guard error == nil, let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String:Any],
                  let reply = json["reply"] as? String else {
                Task { @MainActor in self.speak("I couldn't reach the brain just now.") }
                return
            }
            Task { @MainActor in
                self.history.append(["role":"user","content":text])
                self.history.append(["role":"assistant","content":reply])
                self.conversationOpenUntil = Date().addingTimeInterval(25)
                self.speak(reply)
            }
        }.resume()
    }

    private func speak(_ text: String) {
        stopRecognition()
        visualState = "speaking"
        let chunks = chunk(text)
        playChunks(chunks, index: 0)
    }

    private func playChunks(_ chunks: [String], index: Int) {
        guard index < chunks.count else {
            conversationOpenUntil = Date().addingTimeInterval(20)
            beginListening()
            return
        }

        let endpoint = serverBase.appendingPathComponent("api/tts")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": chunks[index]])

        URLSession.shared.dataTask(with: request) { [weak self] data, _, error in
            guard let self else { return }
            guard error == nil, let data else {
                Task { @MainActor in self.beginListening() }
                return
            }
            Task { @MainActor in
                do {
                    let p = try AVAudioPlayer(data: data)
                    self.player = p
                    p.prepareToPlay()
                    p.play()
                    let duration = p.duration
                    DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.08) {
                        self.playChunks(chunks, index: index + 1)
                    }
                } catch {
                    self.beginListening()
                }
            }
        }.resume()
    }

    private func chunk(_ text: String) -> [String] {
        var parts: [String] = []
        var rest = text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        while !rest.isEmpty {
            if rest.count <= 180 { parts.append(rest); break }
            let idx = rest.index(rest.startIndex, offsetBy: 180)
            let prefix = rest[..<idx]
            if let split = prefix.lastIndex(where: { ".?!, ".contains($0) }) {
                parts.append(String(rest[...split]).trimmingCharacters(in: .whitespacesAndNewlines))
                rest = String(rest[rest.index(after: split)...]).trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                parts.append(String(prefix))
                rest = String(rest[idx...]).trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        return parts
    }

    private func stopRecognition() {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
    }
}
