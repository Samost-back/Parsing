const USER_BODY = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
};

const BASE_URL = "https://auto.ria.com";
const OUTPUT_FILE = "trailer.json";

const TIMEOUT = 20000;

const SELECTORS = {
  title: "h1",
  price: "#basicInfoPrice strong",
  mileage: "#basicInfoTableMainInfo0 span.body",
  location: "#basicInfoTableMainInfoGeo span.body",
  description: ".expandable-text-template",
  fallbackDescription: 'h2:contains("Опис")',
  photos: "#photoSlider img",
  characteristics: "#descCharacteristicsValue span.body",
  links: "a[href*='/auto_']",
};

module.exports = {
  USER_BODY,
  TIMEOUT,
  SELECTORS,
  BASE_URL,
  OUTPUT_FILE,
};
