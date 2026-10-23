import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/** O jogo embutido (plugins/jogo.js). Por enquanto só no Android; o iOS vem depois. */
const JOGO = 'file:///android_asset/jogo/index.html';

/**
 * O Chromium não aceita fetch de file://, e o jogo carrega o som assim. Antes da página, o fetch de
 * arquivos locais passa a ler por XMLHttpRequest; o resto (servidor, lista de salas) segue normal.
 */
const FETCH_LOCAL = `(function () {
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.protocol !== 'file:') return nativeFetch(input, init);
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url.href);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () { resolve(new Response(xhr.response, { status: 200 })); };
      xhr.onerror = function () { reject(new TypeError('não leu ' + url.href)); };
      xhr.send();
    });
  };
})();
true;`;

// A tela não apaga no meio da partida: a flag fica na Activity (plugins/tela-acesa.js), sem depender do JS.
export default function App() {
  return (
    <>
      <StatusBar hidden />
      <WebView
        style={styles.jogo}
        source={{ uri: JOGO }}
        // Só o jogo embutido abre aqui; outro endereço vai para o navegador do sistema.
        originWhitelist={['file://*']}
        // Os sons são lidos de file:// pela própria página; servidor e lista de salas não precisam de
        // acesso universal (WebSocket e CORS aberto em /salas).
        allowFileAccess
        allowFileAccessFromFileURLs
        injectedJavaScriptBeforeContentLoaded={FETCH_LOCAL}
        mediaPlaybackRequiresUserAction={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        // Inspeção pelo chrome://inspect só no build de desenvolvimento.
        webviewDebuggingEnabled={__DEV__}
      />
    </>
  );
}

const styles = StyleSheet.create({
  jogo: { flex: 1, backgroundColor: '#ebe3cf' },
});
