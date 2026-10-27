import { io } from 'socket.io-client';
import api, { SOCKET_ORIGIN } from './api';

// A signed-in Socket.io connection. The session cookie can't reach the
// socket server (different domain), so every connect and reconnect first
// fetches a short-lived socket token from the API; the server then only
// lets this socket into its own company's and user's rooms.
export function connectSocket() {
  return io(SOCKET_ORIGIN, {
    transports: ['websocket', 'polling'],
    auth: (cb) => {
      api.get('/auth/socket-token')
        .then(({ data }) => cb({ token: data.token }))
        .catch(() => cb({}));
    },
  });
}
