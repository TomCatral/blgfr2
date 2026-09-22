// Port ownership is intentionally handled by the operating system. The server
// reports EADDRINUSE with the fixed public URL instead of terminating unrelated
// processes or silently moving the application to another localhost port.
console.log('[startup] Using the single application URL http://localhost:3001');
