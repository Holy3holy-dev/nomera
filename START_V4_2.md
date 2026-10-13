# H3H Nomera V4.2 — переключение на Firebase `h3h-nomera-server`

## КРИТИЧЕСКИ ВАЖНО

- **Это переключение клиента и серверной админки на один проект Firebase.** Оно **не переносит** содержимое базы `bazanomerann` автоматически, не меняет правила и не превращает старую клиентскую торговлю в защищённые серверные операции.
- **До экспорта данных не удаляйте `bazanomerann`**, не перезаписывайте игроков и не выставляйте новый проект публично с глобальными `.write: true`.
- Все конфиденциальные ключи кладите **только в Netlify Environment variables**, никогда в чат/GitHub/ZIP.
- В этом ZIP специально **нет выдуманных API-ключей** нового проекта. Без корректной конфигурации игра работает только локально и показывает статус настройки Firebase.

## Шаг 1 — Получить PUBLIC Firebase Web App конфигурацию

1. [Firebase Console](https://console.firebase.google.com/project/h3h-nomera-server/settings/general) → «Настройки проекта» → «Ваши приложения» (Your apps).
2. Если веб-приложение ещё не создано — добавьте **Web App** (значок `</>`), назовите `Nomera Web`.
3. Переключитесь на **SDK setup and configuration → Config**. Скопируйте только **веб-конфигурацию**, например поля `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId` и т.п.
4. На вкладке **Realtime Database → Data** скопируйте **Database URL**. Значение `databaseURL` должно указывать на `h3h-nomera-server-default-rtdb` в **реальном регионе проекта**. Если поля нет в Web Config, добавьте его вручную.

Пример формы (поля и URL здесь — ЗАГЛУШКИ, не вставляйте их дословно):

```json
{"apiKey":"ВЕБ_API_KEY_ИЗ_FIREBASE","authDomain":"h3h-nomera-server.firebaseapp.com","databaseURL":"https://h3h-nomera-server-default-rtdb.<ВАШ_РЕГИОН>.firebasedatabase.app","projectId":"h3h-nomera-server","messagingSenderId":"ЗНАЧЕНИЕ_ИЗ_FIREBASE","appId":"ЗНАЧЕНИЕ_ИЗ_FIREBASE"}
```

Это **публичные** параметры Web App, в отличие от JSON **Service account**.

## Шаг 2 — Netlify → Project configuration → Environment variables

Настройте 5 переменных для Production + Functions (или All scopes):

| Key | Value |
| --- | --- |
| `NOMERA_FIREBASE_WEB_CONFIG` | **ВЕСЬ JSON** публичной Web App конфигурации из шага 1, в одну строку. В него добавьте точный `databaseURL`. |
| `FIREBASE_DATABASE_URL` | **Точный URL** базы из Firebase Console → Realtime Database → Data. Должен совпадать с `databaseURL` в JSON. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON сервисного ключа **именно `h3h-nomera-server`**. Старый ключ не подойдёт. Только секрет Netlify. |
| `NOMERA_ADMIN_PASSWORD_HASH` | Scrypt-хэш пароля админа (не открытый пароль). Команда ниже. |
| `NOMERA_ADMIN_SESSION_SECRET` | Случайный секрет от 32 байт. Команда ниже. |

Пароль администратора **смените**: прежний ранее был отправлен в переписке.

```powershell
$env:NOMERA_ADMIN_PASSWORD = Read-Host 'Новый пароль админки'
npm run admin:hash
Remove-Item Env:\NOMERA_ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Используйте `npm run admin:hash` в корне исходников (должен быть установлен Node.js).

## Шаг 3 — Публикация

Полный проект (из папки `H3H_Nomera_Codex`) выложите в GitHub и привяжите к существующему Netlify сайту `nomera1`; **не создавайте другой сайт**. Netlify собирает функции по `netlify.toml`:

- Build command: `npm run build`.
- Publish directory: `dist`.
- Functions directory: `netlify/functions`.
- Node.js >= 22.

Обычное ручное перетаскивание ZIP/`dist` в Netlify **не публикует функции**. Для сборки/публикации используйте Git integration или Netlify CLI.

После установки переменных — **Trigger deploy → Deploy site**. Проверьте:

- `https://nomera1.netlify.app/.netlify/functions/firebase-web-config` должен возвращать строку JavaScript `window.NOMERA_FIREBASE_WEB_CONFIG = {...}` с `projectId: "h3h-nomera-server"`; **никогда не должен показывать private_key**.
- `https://nomera1.netlify.app/.netlify/functions/admin?action=session` должен возвращать 401, если админка настроена и вход ещё не выполнен (другая ошибка говорит о других настройках).
- В игре «Онлайн → Проверить» проверяется *только чтение*. Чат/торговля требуют дополнительных прав или серверной миграции.

## Шаг 4 — Перенос данных БЕЗ потерь

1. Откройте **старую** `bazanomerann` → Realtime Database → Data → меню **Export JSON**. Скачайте резервную копию на надёжное место. База может содержать PIN игроков — не выкладывайте файл публично.
2. В **новой** `h3h-nomera-server` → Realtime Database → Data проверьте, что нет важных существующих данных. **Импорт всего JSON заменит совпадающие узлы**, поэтому при непустой базе сначала сохраните отдельный экспорт и согласуйте слияние.
3. Если новая база пустая и структура совместима — **Import JSON** из экспорта старой базы, затем проверьте наличие `users`, `market`, `chat`, `leaderboard` и другое.
4. Только после проверки миграции начинайте играть в новом проекте. Локальные сохранения браузера сами по себе в новую БД не переносят аккаунты других устройств.

## Шаг 5 — Правила безопасности

- В комплекте `database.rules.json` — **чтение чата/рынка, но запись в них запрещена**. Это безопасный диагностический старт, а не готовый multiplayer.
- Временная запись в чат по правилам без Firebase Auth допускает подмену имени. Не открывайте `users`/`market` глобально на запись.
- Для полноценной онлайн-торговли и защиты от читов всё ещё нужны Firebase Authentication или другой надёжный вход, серверная проверка операций и перенос денежных операций в функции.

## Обновление сервиса/кэша

После публикации на мобильном Chrome закройте старые вкладки, откройте игру заново (при необходимости очистите данные сайта). В V4.2 статический service worker не кеширует ответ `/\.netlify/functions/firebase-web-config`, поэтому публичная конфигурация не должна застревать в кэше.
