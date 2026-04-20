const axios = require("axios");
const cheerio = require("cheerio");
const { TIMEOUT, USER_BODY, SELECTORS, BASE_URL } = require("./constants");
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: USER_BODY,
        timeout: TIMEOUT,
      });

      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(attempt * 2000);
    }
  }
}

function urlArrayAd(html, urlArray) {
  const $ = cheerio.load(html);
  const seen = new Set();

  $(SELECTORS.links).each((_, el) => {
    let href = $(el).attr("href");
    if (!href) return;

    href = href.split("?")[0];
    if (!href.startsWith("http")) {
      href = BASE_URL + href;
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

    if (match) mileage = parseInt(match[1], 10) * 1000;
    else if (mileageEl.text().trim() === "Без пробігу") mileage = 0;
  }

  const locationEl = $(SELECTORS.location).first();
  let location = null;

  if (locationEl.length) {
    const parts = locationEl.text().trim().split(",");
    if (parts.length >= 3) {
      location = `${parts[1].trim()}, ${parts[2].trim()}`;
    }
  }

  let description = $(SELECTORS.description).text().trim();
  if (description.length < 20) {
    description = $('h2:contains("Опис")').parent().next().text().trim();
  }
  if (!description) description = null;

  let bodyTypeTrailers = null;
  $(SELECTORS.characteristics).each((_, el) => {
    bodyTypeTrailers = $(el).text().trim();
  });

  const photos = [];

  $(SELECTORS.photos).each((_, el) => {
    let src =
      $(el).attr("data-src") ||
      $(el).attr("src") ||
      $(el).attr("data-original");

    if (src && src.includes("riastatic.com")) {
      photos.push(src.trim().replace("/s/", "/f/"));
    }
  });

  const adId =
    url.match(/auto_.*?_(\d+)\.html/)?.[1] || url.match(/(\d+)\.html/)?.[1];

  if (!adId) throw new Error("Bad ID: " + url);

  return {
    id: adId,
    url,
    title,
    priceUsd,
    mileage,
    location,
    bodyTypeTrailers,
    description,
    photos,
  };
}

async function saveToDb(data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const photoRes = await client.query(
      `INSERT INTO "TrailerPhoto" (photos)
       VALUES ($1)
       RETURNING id`,
      [data.photos],
    );

    const photoId = photoRes.rows[0].id;

    await client.query(
      `
      INSERT INTO "TrailerOption"
      (ria_id, url_ria, price_usd, mileage, location, body_type_trailers, description, trailer_photo_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (ria_id) DO NOTHING
      `,
      [
        data.id,
        data.url,
        data.priceUsd,
        data.mileage,
        data.location,
        data.bodyTypeTrailers,
        data.description,
        photoId,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function scrapeAd(url, maxPages = 1) {
  const allUrls = [];

  for (let i = 0; i < maxPages; i++) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("page", i);

    const html = await fetchPage(pageUrl.toString());
    urlArrayAd(html, allUrls);

    await sleep(1500);
  }

  console.log("Found:", allUrls.length);

  for (const adUrl of allUrls) {
    try {
      await sleep(2000 + Math.random() * 2000);

      const html = await fetchPage(adUrl);
      const data = parseAd(html, adUrl);

      await saveToDb(data);

      console.log("Saved:", data.id);
    } catch (err) {
      console.error("Skip:", adUrl);
      console.error(err.message);
    }
  }
}

const url =
  "https://auto.ria.com/uk/search/?indexName=auto%2Corder_auto%2Cnewauto_search&categories.main.id=5&body.id%5B26%5D=168"; // Тимчасовий
const maxPages = 1; // Тимчасовий

scrapeAd(url, maxPages).catch((err) => {
  console.error(err);
  process.exit(1);
});
