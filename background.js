// 让客服分页在背景时不会被浏览器「休眠 / 释放」，确保离开对话后仍能自动完成
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg === "keepAlive" && sender.tab) {
    chrome.tabs.update(sender.tab.id, { autoDiscardable: false });
  }
});
