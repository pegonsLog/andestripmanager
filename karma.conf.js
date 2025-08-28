// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine", "@angular-devkit/build-angular"],
    plugins: [
      require("karma-jasmine"),
      require("karma-chrome-headless"),
      require("karma-jasmine-html-reporter"),
      require("karma-coverage"),
      require("@angular-devkit/build-angular/plugins/karma"),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution order
        random: true,
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require("path").join(__dirname, "./coverage/andestripmanager"),
      subdir: ".",
      reporters: [
        { type: "html" },
        { type: "text-summary" },
        { type: "lcovonly" },
      ],
      check: {
        global: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
    reporters: ["progress", "kjhtml", "coverage"],
    browsers: ["ChromeHeadless"],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: "ChromeHeadless",
        flags: ["--no-sandbox", "--disable-web-security"],
      },
    },
    restartOnFileChange: true,
    singleRun: false,

    // Configurações específicas para o projeto
    files: [
      // Incluir arquivos de teste e dependências
      "src/test.ts",
    ],

    // Configurações de timeout
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000,
    captureTimeout: 60000,

    // Configurações de log
    logLevel: config.LOG_INFO,

    // Configurações para CI/CD
    autoWatch: true,

    // Configurações específicas para testes Angular
    preprocessors: {
      "src/**/*.ts": ["coverage"],
    },

    // Mime types para arquivos TypeScript
    mime: {
      "text/x-typescript": ["ts", "tsx"],
    },
  });

  // Configurações específicas para ambiente CI
  if (process.env.CI) {
    config.browsers = ["ChromeHeadlessCI"];
    config.singleRun = true;
    config.autoWatch = false;
  }
};
