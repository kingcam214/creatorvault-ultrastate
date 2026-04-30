with open('server/webrtc.ts', 'r') as f:
    content = f.read()

# Insert setIO(io) after the Socket.IO server is created
old = "    path: '/socket.io/',\n  });"
new = "    path: '/socket.io/',\n  });\n  setIO(io); // expose io for DM real-time delivery"

if 'setIO(io)' not in content:
    content = content.replace(old, new, 1)
    with open('server/webrtc.ts', 'w') as f:
        f.write(content)
    print('Patched webrtc.ts with setIO(io)')
else:
    print('Already patched')
