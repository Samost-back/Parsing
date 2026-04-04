const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function fetchPage(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        timeout: 20000,
      });

      if (res.status === 200) return res.data;
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
}

function parseAd(html, url) {
  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim() || null;

  const priceMatch = $("#basicInfoPrice strong").first().text().trim();
  const priceUsd = priceMatch
    ? parseInt(priceMatch.replace(/\D/g, ""), 10)
    : null;

  let mileage = null;
  const mileageEl = $("#basicInfoTableMainInfo0 span.body").first();
  if (mileageEl.length) {
    const text = mileageEl.text().replace(/\s/g, "");
    const match = text.match(/(\d+)тис\.?км/i);
    if (match) mileage = parseInt(match[1], 10) * 1000;
  }

  const locationEl = $("#basicInfoTableMainInfoGeo span.body").first();
  let location = null;

  if (locationEl.length) {
    const parts = locationEl.text().trim().split(",");
    if (parts.length >= 3) {
      const region = parts[1].trim();
      const city = parts[2].trim();
      location = `${region}, ${city}`;
    }
  }

  let description = $(".expandable-text-template").text().trim();

  if (description.length < 20) {
    description = $('h2:contains("Опис")').parent().next().text().trim();
  }

  if (!description) description = null;

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

  let bodyType = null;
  $("#descCharacteristicsValue span.body").each((_, el) => {
    const text = $(el).text().trim();
    if (BODY_TYPES.includes(text)) {
      bodyType = text;
      return false;
    }
  });

  const photos = new Set();

  try {
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/);

    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[1]);
      const gallery = jsonData?.ad?.photos ?? [];

      gallery.forEach((p) => {
        if (p.full) photos.add(p.full);
      });
    }

    if (photos.size === 0) {
      $("#photoSlider img").each((_, el) => {
        let src =
          $(el).attr("data-src") ||
          $(el).attr("src") ||
          $(el).attr("data-original");

        if (src && src.includes("riastatic.com")) {
          photos.add(src.replace("/s/", "/f/"));
        }
      });
    }
  } catch (err) {
    console.log("Фото не витягнуто:", err.message);
  }

  const adId = url.match(/(\d+)\.html/)?.[1];
  if (!adId) throw new Error(`Зламаний ID: ${url}`);

  return {
    id: adId,
    url,
    title,
    priceUsd,
    mileage,
    location,
    bodyType,
    description,
    photos: [...photos],
  };
}

async function scrapeAd(url) {
  const html = await fetchPage(url);
  const data = parseAd(html, url);

  const filename = `ad_${data.id}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf-8"); //Тимчасово

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
