(() => {
  const DEFAULTS = {
    enabled: true, siteMatch: "",
    leaveKeywords: "会员已离开\n访客已离开\n对方已离开\n离开对话\n已跳出\n对话已结束",
    finishTexts: "完成\n结束对话\n结束",
    confirmTexts: "确定\n确认",
    delayMs: 0
  };
  let cfg = { ...DEFAULTS };
  let busy = false;
  const handled = new WeakSet();

  const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);
  const log = (...a) => console.log("[自动完成]", ...a);

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  }

  function findButton(texts) {
    const sel = 'button, [role="button"], a, input[type="button"], input[type="submit"], .btn, [class*="button"], [class*="btn"]';
    const els = [...document.querySelectorAll(sel)].filter(isVisible);
    for (const t of texts) {
      const el = els.find(e => ((e.innerText || e.value || "").trim() === t) && !e.disabled);
      if (el) return el;
    }
    return null;
  }

  function click(el) {
    el.scrollIntoView({ block: "center" });
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type =>
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
    );
  }

  function trigger(reason) {
    if (busy) return;
    busy = true;
    log("侦测到离开：", reason);
    setTimeout(() => {
      const btn = findButton(lines(cfg.finishTexts));
      if (btn) {
        log("点击：", btn.innerText || btn.value);
        click(btn);
        // 处理可能出现的确认视窗
        setTimeout(() => {
          const ok = findButton(lines(cfg.confirmTexts));
          if (ok) { log("点击确认：", ok.innerText || ok.value); click(ok); }
        }, 800);
      } else {
        log("找不到「完成」按钮");
      }
      setTimeout(() => { busy = false; }, 3000);
    }, Number(cfg.delayMs) || 0);
  }

  function scan(node) {
    if (!cfg.enabled) return;
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el || handled.has(el)) return;
    const text = (el.innerText || el.textContent || "");
    const kw = lines(cfg.leaveKeywords).find(k => text.includes(k));
    if (kw) { handled.add(el); trigger(kw); }
  }

  function active() {
    return cfg.enabled && (!cfg.siteMatch || location.href.includes(cfg.siteMatch));
  }

  const observer = new MutationObserver(muts => {
    if (!active()) return;
    for (const m of muts) {
      if (m.type === "characterData") scan(m.target);
      m.addedNodes.forEach(scan);
    }
  });

  chrome.storage.sync.get(DEFAULTS, saved => {
    cfg = saved;
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    if (active()) log("已启用");
  });
  chrome.storage.onChanged.addListener(ch => {
    for (const k in ch) cfg[k] = ch[k].newValue;
  });
})();
