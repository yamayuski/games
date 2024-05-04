import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/games/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'capylabs-01': resolve(__dirname, 'capylabs-01/index.html'),
        'many-tree': resolve(__dirname, 'many-tree/index.html'),
        pong: resolve(__dirname, 'pong/index.html'),
        'skybox-simulator': resolve(__dirname, 'skybox-simulator/index.html'),
        'tic-tac-toe': resolve(__dirname, 'tic-tac-toe/index.html'),
      },
    },
  },
});
