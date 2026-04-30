with open('server/webrtc.ts', 'r') as f:
    content = f.read()

# Add user room join on connection so we can emit to user:ID rooms
old = "  io.on('connection', (socket) => {\n    console.log('[WebRTC] Client connected:', socket.id);"
new = """  io.on('connection', (socket) => {
    console.log('[WebRTC] Client connected:', socket.id);
    // Join personal room for DM real-time delivery
    socket.on('join-user-room', (userId: number) => {
      socket.join(`user:${userId}`);
      console.log(`[WebRTC] Socket ${socket.id} joined user:${userId}`);
    });"""

if 'join-user-room' not in content:
    content = content.replace(old, new, 1)
    with open('server/webrtc.ts', 'w') as f:
        f.write(content)
    print('Patched: added join-user-room handler')
else:
    print('Already patched')
