const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(Math.floor(Math.random() * 5000 + 3000));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
];

const buildHeaders = () => ({
  "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://auto.ria.com/uk/",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
});

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await randomDelay();
      const res = await axios.get(url, {
        headers: buildHeaders(),
        timeout: 20000,
      });
      if (res.status === 200) return res.data;
    } catch (err) {
      if (attempt < retries) await sleep(3000 * attempt);
    }
  }
  throw new Error(`Failed to fetch after ${retries} attempts`);
}

function parseAd(html, url) {
  const $ = cheerio.load(html);

  // Назва
  const title = $("h1").first().text().trim() || null;

  // Ціна
  const priceMatch = html.match(/(\d[\d\s]+)\s*\$/);
  const priceUsd = priceMatch
    ? parseInt(priceMatch[1].replace(/\s/g, ""), 10)
    : null;

  // Пробіг
  const mileageMatch = html.match(/([\d\s]+)\s*тис\.?\s*км/i);
  const mileage = mileageMatch
    ? parseInt(mileageMatch[1].replace(/\s/g, ""), 10) * 1000
    : null;

  // Локація
  const locationMatch = html.match(/UA,\s*([^,]+\s+обл\.),\s*([^,<]+)/);
  const location = locationMatch
    ? `${locationMatch[1].trim()}, ${locationMatch[2].trim()}`
    : null;

  // Опис
  let description = $(".expandable-text-template").text().trim();

  if (description.length < 20) {
    description = $('h2:contains("Опис")').parent().next().text().trim();
  }

  if (!description) description = null;

  // Тип кузова
  const BODY_TYPES = [
    "Рефрижератор",
    "Тентований",
    "Самоскид",
    "Фургон",
    "Платформа",
    "Контейнеровоз",
    "Цистерна",
    "Борт",
    "Евакуатор",
  ];
  const bodyType = BODY_TYPES.find((t) => html.includes(t)) || null;

  // Фото
  const photos = [];

  $("#photoSlider img, .carousel-inner img").each((_, el) => {
    let src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-original");

    if (
      src &&
      src.includes("riastatic.com/photosnew/auto/photo") &&
      src.endsWith(".jpg")
    ) {
      src = src.replace("/s/", "/f/");
      photos.push(src);
    }
  });
  const uniquePhotos = [...new Set(photos)];

  const adId = url.match(/(\d+)\.html/)?.[1];
  if (!adId) throw new Error(`Cannot parse ad ID from URL: ${url}`);

  return {
    id: adId,
    url,
    title,
    priceUsd,
    mileage,
    location,
    bodyType,
    description,
    photos: uniquePhotos,
  };
}

async function scrapeAd(url) {
  const html = await fetchPage(url);
  const data = parseAd(html, url);

  const filename = `ad_${data.id}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf-8");

  return data;
}

const url =
  process.argv[2] ||
  "https://auto.ria.com/uk/auto_schmitz-cargobull_cargobull_35351484.html";

scrapeAd(url)
  .then((data) => console.log("Saved:", data.id))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
