WINDOWS
=====

ssh -L 9222:127.0.0.1:9222 adminLegacy@167.235.55.194


LINUX
=======
npm run dev

xvfb-run --server-args="-screen 0 1024x768x24" /usr/bin/google-chrome \
--no-sandbox \
--disable-dev-shm-usage \
--remote-debugging-port=9222 \
--user-data-dir=/tmp/chrome-automatio

DevTools listening on ws://127.0.0.1:9222/devtools/browser/858fb9dc-9faa-4823-bda9-2efa79a606d3

