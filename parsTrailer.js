const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const {
  BODY_TYPES_TRAILERS,
  TIMEOUT,
  USER_BODY,
  SELECTORS,
  BASE_URL,
  OUTPUT_FILE,
} = require("./constants");

async function fetchPage(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: USER_BODY,
        timeout: TIMEOUT,
      });

      if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${url}`);
      return res.data;
    } catch (err) {
      if (attempt === retries) throw err;

      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
}

function urlArrayAd(html, urlArray) {
  const $ = cheerio.load(html);
  const base = BASE_URL;
  const seen = new Set();

  $(SELECTORS.links).each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;

    href = href.split("?")[0];
    if (!href.startsWith("http")) {
      href = base + href;
    }

    const isValidAd = /\/auto_.*_\d+\.html$/.test(href);

    if (href.includes(BASE_URL) && isValidAd && !seen.has(href)) {
      seen.add(href);
      urlArray.push(href);
    }
  });

  return urlArray;
}

function parseAd(html, url) {
  const $ = cheerio.load(html);

  const title = $(SELECTORS.title).first().text().trim() || null;

  const priceText = $(SELECTORS.price).first().text();
  const priceUsd = priceText
    ? parseInt(priceText.replace(/\D/g, ""), 10)
    : null;

  let mileage = null;
  const mileageEl = $(SELECTORS.mileage).first();
  if (mileageEl.length) {
    const text = mileageEl.text().replace(/\s/g, "");
    const match = text.match(/(\d+)тис\.?км/i);
    if (match) {
      mileage = parseInt(match[1], 10) * 1000;
    } else if (mileageEl.text().trim() === "Без пробігу") {
      mileage = 0;
    }
  }

  const locationEl = $(SELECTORS.location).first();
  let location = null;

  if (locationEl.length) {
    const parts = locationEl.text().trim().split(",");
    if (parts.length >= 3) {
      const region = parts[1].trim();
      const city = parts[2].trim();
      location = `${region}, ${city}`;
    }
  }

  let description = $(SELECTORS.description).text().trim();

  if (description.length < 20) {
    description = $('h2:contains("Опис")').parent().next().text().trim();
  }

  if (!description) description = null;

  let bodyTypeTrailers = null;
  $(SELECTORS.characteristics).each((_, el) => {
    const text = $(el).text().trim();
    if (BODY_TYPES_TRAILERS.includes(text)) {
      bodyTypeTrailers = text;
      return false;
    }
  });

  const photos = new Set();

  $(SELECTORS.photos).each((_, el) => {
    let src =
      $(el).attr("data-src") ||
      $(el).attr("src") ||
      $(el).attr("data-original");

    if (src && src.includes("riastatic.com")) {
      photos.add(src.trim().replace("/s/", "/f/"));
    }
  });

  const adId =
    url.match(/auto_.*?_(\d+)\.html/)?.[1] || url.match(/(\d+)\.html/)?.[1];

  if (!adId) throw new Error(`Зламаний ID: ${url}`);

  return {
    id: adId,
    url,
    title,
    priceUsd,
    mileage,
    location,
    bodyTypeTrailers,
    description,
    photos: [...photos],
  };
}

async function arrayAd(url) {
  const html = await fetchPage(url);
  const urlArray = [];
  return urlArrayAd(html, urlArray);
}

async function scrapeAd(url) {
  const urls = await arrayAd(url);
  console.log("Found ads:", urls.length);

  const filename = OUTPUT_FILE;

  let existing = [];
  try {
    const file = await fs.promises.readFile(filename, "utf-8");
    existing = file ? JSON.parse(file) : [];
  } catch {
    existing = [];
  }

  try {
    for (const adUrl of urls) {
      try {
        const delay = Math.floor(Math.random() * 1000) + 1000;
        await new Promise((r) => setTimeout(r, delay));

        const html = await fetchPage(adUrl);
        if (!html) continue;

        let data;

        try {
          data = parseAd(html, adUrl);
        } catch (err) {
          console.error("Parse failed, skip:", adUrl);
          continue;
        }

        const alreadyExists = existing.some((item) => item.id === data.id);

        if (!alreadyExists) {
          existing.push(data);
          console.log("Saved:", data.id);
        }
      } catch (err) {
        console.error("Error parsing:", adUrl);
        console.error(err.message);
      }
    }
  } finally {
    await fs.promises.writeFile(
      filename,
      JSON.stringify(existing, null, 2),
      "utf-8",
    );
  }
  return existing;
}

const url =
  process.argv[2] ||
  "https://auto.ria.com/uk/search/?indexName=auto%2Corder_auto%2Cnewauto_search&categories.main.id=5&body.id%5B26%5D=168"; // Тимчасовий

scrapeAd(url).catch((err) => {
  console.error(err);
  process.exit(1);
});
