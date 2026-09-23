const DEFAULTS = {
  enabled: true, siteMatch: "",
  leaveKeywords: "离开对话",
  finishTexts: "完成",
  confirmTexts: "确定\n确认",
  delayMs: 1500
};
const keys = Object.keys(DEFAULTS);
chrome.storage.sync.get(DEFAULTS, cfg => {
  for (const k of keys) {
    const el = document.getElementById(k);
    if (el.type === "checkbox") el.checked = cfg[k]; else el.value = cfg[k];
  }
});
document.getElementById("save").onclick = () => {
  const out = {};
  for (const k of keys) {
    const el = document.getElementById(k);
    out[k] = el.type === "checkbox" ? el.checked : (k === "delayMs" ? Number(el.value) : el.value);
  }
  chrome.storage.sync.set(out, () => {
    document.getElementById("msg").textContent = "已保存 ✓（重新整理客服页面生效）";
  });
};
