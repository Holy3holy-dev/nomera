# H3H Nomera V4.1 — запуск Netlify Functions и диагностика рынка/чата

## 1. Две независимые технологии

- `/.netlify/functions/admin` — защищённая функция Netlify: требует **сборки функций** и серверных переменных.
- `market`, `chat`, `users`, `online`, `leaderboard` — существующая Firebase Realtime Database, к которой текущая игра обращается **из браузера**. Netlify environment variables не дают браузеру доступ к этим узлам. Firebase Database Rules проверяются отдельно.

## 2. Netlify: серверная админка

Войти в https://app.netlify.com/projects/nomera1/overview → **Project configuration** → **Environment variables** → Add variable. Для Production и Functions (или All scopes, если интерфейс не предлагает отдельный scope) задать:

| Key | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Полный JSON от Firebase Console → Project settings → Service accounts → Generate new private key. Вводить только в Netlify Secret, **никогда не класть в GitHub/сайт/ZIP/чат**. |
| `FIREBASE_DATABASE_URL` | `https://bazanomerann-default-rtdb.europe-west1.firebasedatabase.app` |
| `NOMERA_ADMIN_PASSWORD_HASH` | Вывод `npm run admin:hash` по инструкции ниже. Это scrypt-хэш, **не сам пароль**. |
| `NOMERA_ADMIN_SESSION_SECRET` | Случайная строка не короче 32 байт; пример генерации ниже. |

В папке проекта на ПК в PowerShell:

```powershell
$env:NOMERA_ADMIN_PASSWORD = Read-Host 'Пароль админки'
npm run admin:hash
Remove-Item Env:\NOMERA_ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Первая команда выводит `scrypt$...` для `NOMERA_ADMIN_PASSWORD_HASH`, а последняя — случайное значение для `NOMERA_ADMIN_SESSION_SECRET`. **Не копировать оба в файл проекта**. Используйте секретные переменные Netlify.

### Как развернуть *функции*, а не только HTML

Рекомендуется подключить GitHub-репозиторий к Netlify; в репозитории в корне должны быть `netlify.toml`, `package.json`, `netlify/functions/` и `index.html`.

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Functions directory:** `netlify/functions` (уже в `netlify.toml`)

Пересоберите/опубликуйте проект после изменения переменных. В Netlify должно появиться серверное имя функции `admin` в разделе Functions/Logs.

Альтернатива через Netlify CLI в корне проекта: `npx netlify-cli deploy --prod --site nomera1` (потребуется вход в аккаунт и установка зависимостей через `npm install`). В документации CLI указано, что он умеет разворачивать и сайт, и функции. Простая перетаскиваемая папка `dist` публикует только статические файлы.

### Проверка функции

На опубликованном домене откройте `https://ВАШ-ДОМЕН/.netlify/functions/admin?action=session`.

- `401` с JSON `Сессия не найдена` — **нормально** для гостя; функция работает.
- `503` с JSON о настройке администратора — секреты не заданы или неверный scope/контекст.
- `404` — функция не была опубликована, проверьте Deploy log/Functions.
- `500` — серверная ошибка, нужны Function logs. Ошибки service account могут проявляться и при входе; проверяйте logs, не выводите приватный ключ в лог.

## 3. Почему не работают чат и рынок

В текущем клиенте загружаются Firebase Compat SDK с `www.gstatic.com`, затем открывается **Realtime Database** проекта `bazanomerann`. Чтения и записи в узлы `market` и `chat` не проходят через админскую функцию. Причины: SDK заблокирован, потеря соединения, неверные Database Rules, не тот Firebase project/database, лимиты Firebase или ошибки JavaScript.

Откройте **Firebase Console** → выберите `bazanomerann` → **Build → Realtime Database → Rules**. Проверьте, что политика позволяет именно текущим клиентам чтение и запись в `market`, `chat` и запись в `users/<имя-игрока>/inventory` для операции выставления лота. **Не применяйте `docs/database.v2.staging.rules.json` к работающей V4:** там всё запрещено текущему анонимному клиенту. Файл `database.rules.json` из старой версии полностью открывает доступ к пользовательским данным и балансу; **это небезопасно для публичного сервиса, не публикуйте такие правила в production**. Для полноценной защиты нужен Firebase Authentication и серверные операции торговли/экономики.

После установки V4.1 во вкладке «Онлайн» появился статус «Firebase: подключено/нет соединения» и кнопка **Проверить**. Она проверяет права **чтения**, но не запись. Чтобы проверить запись, отправьте тестовое сообщение или выставьте номер; при отказе операции появится предупреждение с объяснением причины. Сообщение останется в поле ввода, номер останется в инвентаре.

В Chrome/Android при ошибке откройте консоль разработчика на ПК (F12) и найдите `PERMISSION_DENIED`, `Firebase init error`, `net::ERR_BLOCKED_BY_CLIENT`, `Failed to fetch`, `ERR_NAME_NOT_RESOLVED` и т.п.

## 4. Исправления V4.1

- Безуспешная продажа **не удаляет номер** из инвентаря.
- Создание лота и изменение облачного инвентаря отправляются **одним атомарным multi-location update**; состояние браузера меняется только после подтверждения сервера.
- В чате сообщение очищается только после подтверждения Firebase; при ошибке показывается подсказка.
- Подключение Firebase и ошибки чтения рынка/чата стали видны пользователю.
- Снятие лота с продажи также ожидает подтверждения Firebase.

## 5. Важные ограничения

V4.1 решает проблему ложных успехов и делает диагностику понятной, но **не делает торговлю защищённой**: текущий клиент не проходит аутентификацию Firebase, а покупки и изменение балансов по-прежнему выполняются напрямую браузером. Для публичной мультиплеерной экономики нужна отдельная миграция на Firebase Authentication и серверно-авторитетные сделки. Данные существующей базы при обновлении ZIP автоматически не изменяются.
