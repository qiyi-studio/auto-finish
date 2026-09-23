(() => {
  const DEFAULTS = {
    enabled: true, siteMatch: "",
    leaveKeywords: "离开对话",
    finishTexts: "完成",
    confirmTexts: "确定\n确认",
    delayMs: 0
  };
  let cfg = { ...DEFAULTS };
  let busy = false;
  const handled = new WeakSet();

  const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);
  // 去掉空白和勾勾图示，例如「✓ 完成」→「完成」
  const norm = s => (s || "").replace(/[\s✓✔√✅]/g, "");
  const log = (...a) => console.log("[自动完成]", ...a);

  // 只看元素本身有没有被隐藏，不管分页或视窗是否在前景
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  }

  function findButton(texts) {
    const sel = 'button, [role="button"], a, input[type="button"], input[type="submit"], .btn, [class*="button"], [class*="btn"]';
    const els = [...document.querySelectorAll(sel)].filter(isVisible);
    for (const t of texts) {
      const el = els.find(e => norm(e.innerText || e.value) === norm(t) && !e.disabled);
      if (el) return el;
    }
    return null;
  }

  // 确认「完成」按钮所在的标题区块有这位会员的帐号，避免把正在看的别人对话结束掉
  // 只往上找到「还没包含离开提示」的区块为止，才不会把聊天内容当成标题
  function headerHasMember(btn, member, notice) {
    if (!member) return true;
    let el = btn;
    for (let i = 0; i < 6 && el && !el.contains(notice); i++, el = el.parentElement) {
      if ((el.innerText || "").includes(member)) return true;
    }
    return false;
  }

  function click(el) {
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type =>
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
    );
  }

  function trigger(member, line, notice) {
    if (busy) return;
    busy = true;
    log("侦测到离开：", line);
    const run = () => {
      const btn = findButton(lines(cfg.finishTexts));
      if (!btn) {
        log("找不到「完成」按钮");
      } else if (!headerHasMember(btn, member, notice)) {
        log("离开的会员（" + member + "）不是目前对话，略过");
      } else {
        log("点击：", btn.innerText || btn.value);
        click(btn);
        setTimeout(() => {
          const ok = findButton(lines(cfg.confirmTexts));
          if (ok) { log("点击确认：", ok.innerText || ok.value); click(ok); }
        }, 800);
      }
      setTimeout(() => { busy = false; }, 3000);
    };
    // 延迟 0 时立即执行，不经过计时器（背景分页的计时器会被浏览器拖慢）
    const d = Number(cfg.delayMs) || 0;
    d > 0 ? setTimeout(run, d) : run();
  }

  function scan(node) {
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el || handled.has(el)) return;
    const text = el.innerText || el.textContent || "";
    for (const line of text.split("\n")) {
      const kw = lines(cfg.leaveKeywords).find(k => line.includes(k));
      if (!kw) continue;
      handled.add(el);
      // 例：「y438885072 已于 2026/09/23 17:36:30 离开对话」→ 会员 y438885072
      const m = line.trim().match(/^(\S+)\s*已于/);
      trigger(m ? m[1] : "", line.trim(), el);
      return;
    }
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
    if (active()) {
      log("已启用（画面不在此分页也会运作）");
      if (window === window.top) chrome.runtime.sendMessage("keepAlive").catch(() => {});
    }
  });
  chrome.storage.onChanged.addListener(ch => {
    for (const k in ch) cfg[k] = ch[k].newValue;
  });
})();
