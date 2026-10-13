# Продолжение H3H Nomera в Codex

## Запуск пользователем

Распакуй архив в отдельную папку на компьютере. Открой эту папку в Codex и отправь:

> Прочитай START_HERE_CODEX.md. Продолжи существующий H3H Nomera: перенеси готовые изменения в отдельную ветку репозитория Holy3holy-dev/nomera, проверь их, создай PR и опубликуй фронтенд на существующем GitHub Pages. Публикацию я разрешаю. Рабочую базу Firebase, её правила и миграции не меняй.

Не открывай только голый main из GitHub: подготовленные изменения пока туда не отправлены.
Архив содержит готовый обновлённый проект, а не просто техническое задание.

## Инструкция следующему Codex

Ты продолжаешь уже выполненную работу, не создаёшь игру заново.
Репозиторий: https://github.com/Holy3holy-dev/nomera
Существующий сайт: https://holy3holy-dev.github.io/nomera/

Пользователь явно разрешил публикацию подготовленного фронтенда на этом сайте.
Запрет на прямое изменение main сохраняется: отдельная ветка → PR → merge → GitHub Pages.
Изменение продуктивных данных, Firebase Auth, database rules и миграция PIN требуют отдельного согласования.

### Состояние

Архив — snapshot ветки `dev/interface-audio-refresh`, основанной на:
- исходный main: `6489745c063f50ee6492e3382bdb22e46e9e066a`;
- первый этап: `cf9284f039ea9be928fc127e1312a7f27bb73626`;
- интерфейс и звук: `2cc52d0aa772cfb24a553eafa429cbadeefc783b`.

История Git намеренно не включена в архив: в старой истории есть раскрытый администраторский секрет.
Указанные локальные commits не были отправлены в remote и могут отсутствовать в новом clone.

Готово:
- исправлены XP гонки, peak speed, records, repeated reward claims, пустой гараж, stale cloud hydration;
- security/storage/race-records modules, безопасные HTML/JS contexts и URL изображений;
- удалены публичный admin bypass/secret и просмотр PIN; admin и небезопасный nickname rename временно заблокированы;
- graphite/lime H3H UI, SVG icons, семь мобильных вкладок, generator showcase, новые cards/settings;
- Web Audio module: click/tick/lock/cash/win/start/crash и engine speed/gas/nitro;
- volume/mute/engine preferences в отдельном localStorage key, lazy AudioContext и background cleanup;
- PWA shell с версиями ресурсов и локальными icons; early image fallback исправлен;
- 27 Node tests, статические checks, optional browser smoke runner.

Проверки прошли в предыдущей среде:
- `npm run check` и `npm test`: 27/27;
- `npm run test:browser`: Chromium на 1366×1000, 390×844, 320×740;
- семь вкладок, race start/exit, settings persistence, без JS errors и horizontal overflow;
- desktop/mobile рендеры визуально просмотрены.

Не проверено: реальное мобильное устройство, субъективное прослушивание, actual PWA installation,
live/staging Firebase integration. Browser tests блокировали все внешние запросы, включая Firebase.
Main, опубликованный сайт и рабочая база не менялись.

### Прочитать перед работой

`README.md`, `docs/AUDIT.md`, `docs/FIRST_PR.md`, `docs/UI_AUDIO_PR.md`,
`docs/SERVER_AND_MIGRATION.md`.

Текущий `database.rules.json` — legacy публичные правила; НЕ развёртывать их как безопасную конфигурацию.
`docs/database.v2.staging.rules.json` — только проект, НЕ применять к production.
Legacy PIN/экономика/рынок всё ещё требуют настоящего серверного этапа; не объявлять их защищёнными.

### Публикация

1. Найди существующий local clone пользователя или клонируй правильный репозиторий в новую папку.
   Сохрани несвязанные локальные изменения. Проверь origin и авторизованный GitHub login.
   Нужен write-доступ именно к Holy3holy-dev/nomera. Не печатай токены или credentials.
2. Fetch актуального main. Если он изменился относительно указанного исходного commit,
   сопоставь изменения и аккуратно перенеси патч; не перезаписывай новые upstream изменения snapshot вслепую.
   Git parent/base и archive являются разными источниками: локальные commit SHAs нельзя просто checkout в свежем clone.
3. Создай development branch. Перенеси файлы snapshot, сохрани `.git`, существующие AGENTS.md и пользовательские файлы.
   Новые файлы js/styles/icons/scripts/tests тоже обязательны; одного index.html недостаточно.
   Для неизменного upstream snapshot можно скопировать проект целиком, кроме `.git`.
4. Запусти `npm run check` и `npm test`. `npm run assets` нужен после любых изменений HTML/CSS/JS/manifest/icons,
   чтобы обновить hashes и cache release. Browser smoke setup описан в README.
5. Проверь diff на реальные credentials, accidental deletes, потерю игровых данных и совместимость.
   Не публикуй файл с паролем из чата, auth cookies или database exports. Авторизуйся безопасным штатным способом.
6. Push отдельной ветки, создай PR к main с итоговым описанием двух этапов и ограничениями.
   Не подделывай GitHub checks. После успешных required checks и отсутствия конфликтов merge разрешён
   инструкцией пользователя на публикацию подготовленного фронтенда. Не обходи branch protection.
7. Проверь Settings → Pages и существующий deployment workflow. Сохрани текущий URL и способ hosting.
   Если Pages уже публикуется из main/root — достаточно merge. Если из Actions — используй текущий pipeline.
   Изменения security-sensitive permissions требуют отдельного подтверждения; не расширяй их автоматически.
8. Дождись фактического успешного deployment и проверь опубликованные HTML, styles.css, все js modules,
   manifest, icons и SW. Для read-only production verification не запускай действия, пишущие в Firebase.
   Не считать push/merge достаточным доказательством публикации.
9. Верни ссылку PR, опубликованный URL, release/commit SHA и результат проверки. Если возник blocker,
   сообщи точный факт и полезный следующий шаг, не заявляй успех.

### Почему прежняя публикация не завершилась

GitHub plugin правильно определял аккаунт Holy3holy-dev и repository permissions,
но создание branch вернуло `403 Resource not accessible by integration`.
Обычный HTTPS git push тоже не имел авторизации. Browser login не завершён.
Переход в локальный Codex не гарантирует write-доступ: используй реально подтверждённую локальную Git/GitHub авторизацию.
Не пытайся обходить отказ расширением permissions или переносом credentials из браузера.
