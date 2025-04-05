document.getElementById("startClean").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: cleanEverything
    });
  });
});

async function cleanEverything() {
  const timer = ms => new Promise(res => setTimeout(res, ms));

  const updateProgress = (type, count) => {
    const progress = document.getElementById(type + "Count");
    if (progress) progress.innerText = count;
  };

  let stats = {
    like: 0,
    post: 0,
    reply: 0,
    highlight: 0,
    article: 0,
    media: 0
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

      const deleteItem = [...document.querySelectorAll('[role="menuitem"]')]
        .find(el => el.innerText.toLowerCase().includes("delete"));
      if (!deleteItem) return false;

      await clickAndWait(deleteItem);

      const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) await clickAndWait(confirm);

      return true;
    } catch (e) {
      console.warn("⚠️ Menu Delete failed:", e.message);
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
      }
    } else if (text.includes("highlight")) {
      if (await deleteWithMenu(article)) {
        stats.highlight++;
        updateProgress("highlight", stats.highlight);
      }
    } else if (text.includes("article")) {
      if (await deleteWithMenu(article)) {
        stats.article++;
        updateProgress("article", stats.article);
      }
    } else if (text.includes("photo") || text.includes("video")) {
      if (await deleteWithMenu(article)) {
        stats.media++;
        updateProgress("media", stats.media);
      }
    } else {
      if (await deleteWithMenu(article)) {
        stats.post++;
        updateProgress("post", stats.post);
      }
    }
  };

  const process = async () => {
    let sameHeightCount = 0;
    let lastHeight = 0;
    const MAX = 1000;

    while (Object.values(stats).reduce((a, b) => a + b) < MAX && sameHeightCount < 4) {
      const articles = [...document.querySelectorAll("article")];

      for (const article of articles) {
        const unlikeBtn = article.querySelector('[data-testid="unlike"]');
        if (unlikeBtn) await unlikeTweet(unlikeBtn);
        await classifyAndDelete(article);
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

    alert(`Done!\n\n1) Unliked: ${stats.like}\n2) Posts: ${stats.post}\n3) Replies: ${stats.reply}\n4) Highlights: ${stats.highlight}\n5) Articles: ${stats.article}\n6) Media: ${stats.media}`);
  };

  process();
}

