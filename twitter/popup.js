document.getElementById("startClean").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: cleanEverything,
    });
  });
});

async function cleanEverything() {
  const timer = (ms) => new Promise((res) => setTimeout(res, ms));

  const updateProgress = (type, count) => {
    const progress = document.getElementById(type + "Count");
    if (progress) progress.innerText = count;
  };

  let stats = {
    post: 0,
    repost: 0,
    like: 0,
    reply: 0,
    highlight: 0,
    article: 0,
    media: 0,
  };

  const clickAndWait = async (el) => {
    el.click();
    await timer(300);
  };

  const deleteWithMenu = async (article) => {
    try {
      const moreBtn = article.querySelector('[aria-label="More"]');
      if (!moreBtn) return false;

      await clickAndWait(moreBtn);

      const deleteItem = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
        el.innerText.toLowerCase().includes("delete")
      );
      if (!deleteItem) return false;

      await clickAndWait(deleteItem);

      const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) await clickAndWait(confirm);

      return true;
    } catch (e) {
      console.warn("⚠️ Delete failed:", e.message);
      return false;
    }
  };

  const undoRepost = async (btn) => {
    try {
      await clickAndWait(btn);

      // Wait for "Undo repost" confirmation
      let confirm = null;
      for (let i = 0; i < 10; i++) {
        confirm = document.querySelector('[data-testid="unretweetConfirm"]');
        if (confirm) break;
        await timer(300);
      }

      if (confirm) {
        await clickAndWait(confirm);
        stats.repost++;
        updateProgress("repost", stats.repost);
        return true;
      }

      return false;
    } catch (e) {
      console.warn("⚠️ Undo repost failed:", e.message);
      return false;
    }
  };

  const unlikeTweet = async (btn) => {
    try {
      await clickAndWait(btn);
      stats.like++;
      updateProgress("like", stats.like);
    } catch (e) {
      console.warn("⚠️ Unlike failed:", e.message);
    }
  };

  const classifyAndDelete = async (article) => {
    const text = article.innerText.toLowerCase();

    if (text.includes("replying to")) {
      if (await deleteWithMenu(article)) {
        stats.reply++;
        updateProgress("reply", stats.reply);
        return true;
      }
    } else if (text.includes("highlight")) {
      if (await deleteWithMenu(article)) {
        stats.highlight++;
        updateProgress("highlight", stats.highlight);
        return true;
      }
    } else if (text.includes("article")) {
      if (await deleteWithMenu(article)) {
        stats.article++;
        updateProgress("article", stats.article);
        return true;
      }
    } else if (text.includes("photo") || text.includes("video")) {
      if (await deleteWithMenu(article)) {
        stats.media++;
        updateProgress("media", stats.media);
        return true;
      }
    } else {
      if (await deleteWithMenu(article)) {
        stats.post++;
        updateProgress("post", stats.post);
        return true;
      }
    }
    return false;
  };

  const process = async () => {
    let sameHeightCount = 0;
    let lastHeight = 0;
    const MAX = 1000;

    while (
      Object.values(stats).reduce((a, b) => a + b) < MAX &&
      sameHeightCount < 4
    ) {
      const articles = [...document.querySelectorAll("article")];

      for (const article of articles) {
        // 1. Try Delete Post
        const deleted = await classifyAndDelete(article);
        if (deleted) continue;

        // 2. Try Undo Repost
        const repostBtn = article.querySelector('[data-testid="unretweet"]');
        if (repostBtn) {
          const undone = await undoRepost(repostBtn);
          if (undone) continue;
        }

        // 3. Try Unlike
        const unlikeBtn = article.querySelector('[data-testid="unlike"]');
        if (unlikeBtn) {
          await unlikeTweet(unlikeBtn);
          continue;
        }

        await timer(200);
      }

      window.scrollBy(0, window.innerHeight);
      await timer(1200);

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) sameHeightCount++;
      else {
        sameHeightCount = 0;
        lastHeight = newHeight;
      }
    }

    alert(
      `Done!\n\n` +
        `1) Posts Deleted: ${stats.post}\n` +
        `2) Reposts Undone: ${stats.repost}\n` +
        `3) Likes Removed: ${stats.like}\n` +
        `4) Replies Deleted: ${stats.reply}\n` +
        `5) Highlights Removed: ${stats.highlight}\n` +
        `6) Articles Removed: ${stats.article}\n` +
        `7) Media Removed: ${stats.media}`
    );
  };

  process();
}

