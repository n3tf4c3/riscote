// Embute o jogo no app: o build do cliente web (`pnpm jogo`, em web/jogo) entra nos assets do Android,
// lido pela WebView em file:///android_asset/jogo/. O Gradle lê a pasta a cada build, então trocar o
// jogo não exige refazer o prebuild.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// riscote: jogo embutido';

module.exports = function withJogo(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARK)) {
      cfg.modResults.contents += `\n${MARK}\nandroid { sourceSets { main { assets.srcDirs += ['../../web'] } } }\n`;
    }
    return cfg;
  });
};
