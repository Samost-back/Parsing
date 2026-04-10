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

const BODY_TYPES_TRAILERS = [
  "Самоскид напівпричіп",
  "Тентований борт (штора) - напівпричіп",
  "Цистерна напівпричіп",
  "Контейнеровоз напівпричіп",
  "Бортовий напівпричіп",
  "Рефрижератор напівпричіп",
  "Борт",
  "Контейнеровоз",
  "Самоскид причіп",
  "Легковий причіп",
  "Тентований борт (штора) - причіп",
  "Причіп зерновоз",
  "Цистерна",
  "Лафет",
  "Рефрижератор",
  "Низкорамна платформа",
  "Ізотермічна будка",
  "Платформа напівпричіп",
  "Причіп дача",
  "Газовоз",
  "Фургон напівпричіп",
  "Платформа",
  "Лісовоз / Сортиментовоз - напівпричіп",
  "Автовоз",
  "Фургон",
  "Для перевезення тварин - напівпричіп",
  "Для перевезення тварин - причіп",
  "Бітумовоз",
  "Лісовоз / Сортиментовоз - причіп",
  "Шасі напівпричіп",
  "Зерновоз - напівпричіп",
  "Інші причепи",
];

module.exports = {
  USER_BODY,
  BODY_TYPES_TRAILERS,
  TIMEOUT,
  SELECTORS,
  BASE_URL,
  OUTPUT_FILE,
};
