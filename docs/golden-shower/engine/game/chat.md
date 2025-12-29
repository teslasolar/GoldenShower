# Game Chat

Chat input and display.

```javascript
/**
 * @udt Game.chat
 * @extends Game
 * Chat input and messaging
 */
Object.assign(GS.Game.prototype, {
  _setupChatInput() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.chatOpen) {
          if (this.chatInput.trim()) this.sendChat(this.chatInput);
          this.chatInput = '';
          this.chatOpen = false;
        } else {
          this.chatOpen = true;
        }
        e.preventDefault();
      } else if (this.chatOpen) {
        if (e.key === 'Escape') { this.chatOpen = false; this.chatInput = ''; }
        else if (e.key === 'Backspace') { this.chatInput = this.chatInput.slice(0, -1); }
        else if (e.key.length === 1) { this.chatInput += e.key; }
        e.preventDefault();
        e.stopPropagation();
      }
    });
  },

  sendChat(text) {
    if (!this.network || !this.localPlayer) {
      this.addChat(`You: ${text}`, '#ffffff');
      return;
    }
    this.network.send('chat', { name: this.localPlayer.name, text: text, color: '#ffffff' });
    this.addChat(`${this.localPlayer.name}: ${text}`, '#ffffff');
  },

  addChat(text, color = '#ffffff') {
    this.chatMessages.push({ text, color, time: Date.now() });
    if (this.chatMessages.length > this.maxChatMessages) this.chatMessages.shift();
  },

  _renderChat() {
    let chatDiv = document.getElementById('game-chat');
    if (!chatDiv) {
      chatDiv = document.createElement('div');
      chatDiv.id = 'game-chat';
      chatDiv.style.cssText = 'position:fixed;bottom:100px;left:20px;max-width:400px;font-size:14px;font-family:monospace;text-shadow:1px 1px 2px black;pointer-events:none;z-index:100;';
      document.body.appendChild(chatDiv);
    }
    const now = Date.now();
    const visible = this.chatMessages.filter(m => now - m.time < 10000);
    chatDiv.innerHTML = visible.map(m => `<div style="color:${m.color};margin:2px 0">${m.text}</div>`).join('');
    if (this.chatOpen) {
      chatDiv.innerHTML += `<div style="background:rgba(0,0,0,0.7);padding:5px;margin-top:5px"><span style="color:#888">Say:</span> <span style="color:#fff">${this.chatInput}_</span></div>`;
    }
  }
});
```
