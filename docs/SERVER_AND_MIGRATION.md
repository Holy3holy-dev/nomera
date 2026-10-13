# Серверная экономика и миграция аккаунтов: проект, не развёртывание

## Граница доверия

Клиент передаёт намерение (`carId`, `plateId`, `lotId`, `requestId`), а не цену/баланс/награду.
HTTPS сервер проверяет Firebase ID token через Admin SDK, принимает `uid` только из проверенного токена,
проверяет App Check, ограничения частоты и размер тела. App Check дополняет авторизацию, не заменяет её.
Admin API требует server-managed custom claim; никнейм и клиентский флаг роли не дают никаких прав.
Для администрирования нужны отдельная аудит-запись, лимиты изменения и недоступные клиентам credentials.
Ключи сервисного аккаунта и pepper живут в Secret Manager, не в JS, Git или логах.

## Предлагаемая совместимая структура RTDB v2

- `/legacyMappings/{canonicalNickname}` → стабильный uid и состояние миграции, доступ только серверу.
- `/credentials/{uid}` → версия KDF, соль, хеш, состояние reset, доступ только серверу.
- `/economy/v2/accounts/{uid}` → balance (целое), level, xp, cars/plates по стабильным ID, revision, raceRecords.
- `/economy/v2/market/{lotId}` → sellerUid, plateId, price, status, createdAt, soldTo.
- `/economy/v2/operations/{uid}/{requestId}` → hash запроса, неизменяемый результат и ledger deltas.
- `/public/v2` → серверные projections рейтинга, профилей и чата без credentials.
- `/audit` → закрытый журнал, retention/TTL, без PIN и текстов токенов.

Проект правил `database.v2.staging.rules.json` лежит в docs и не привязан к firebase.json.
Он закрывает legacy ветви по умолчанию, разрешает только чтение своего v2 account и публичных projections.
**Его нельзя применять к рабочей базе до переключения клиентов: legacy игра перестанет работать.**
Клиенты не пишут balance/инвентарь/лоты/ledger, даже если uid совпадает. Сервер использует Admin SDK.
Для пользовательских настроек/чата также серверные команды с allowlist полей.

## Атомарная покупка и отмена лота

На первом масштабе сервер выполняет одну RTDB transaction на общем предке `/economy/v2`.
Multi-location update атомарен, но сам по себе не проверяет состояние лота и остаток баланса при конкуренции.
Transaction callback чистый: никакого RNG, email, логирования или внешних эффектов внутри повторяемого callback.

`buyLot(uid, lotId, requestId)`:
1. Проверить token, формат/лимиты, canonical hash payload.
2. В transaction: если receipt уже есть — вернуть прежний результат; тот же requestId с другим payload отклонить.
3. Проверить аккаунты, `lot.status=active`, seller != buyer, положительную целую цену, достаточный баланс,
   наличие plateId в escrow продавца. Номер в активном лоте недоступен гаражу и продаже NPC.
4. В одном коммите: debit buyer, credit seller, transfer plate ownership, удалить escrow, status=sold,
   записать buyerUid, revisions и receipt + ledger (сумма deltas = 0 без предусмотренной комиссии).
5. После коммита: сервер обновляет public projections с transaction revision. При сбое projection
   восстанавливается из ledger; повторное выполнение не повторяет деньги/передачу.

`listPlate`: в той же transaction проверить ownership, отсутствие установленного номера, price limits,
перевести plate в escrow и создать active lot вместе с receipt.
`cancelLot`: проверить sellerUid, active status и escrow, вернуть plate и закрыть лот с receipt.
Одновременные buy/buy и buy/cancel имеют ровно один успешный исход.
Для следующего масштаба общий subtree становится точкой конкуренции: измерить latency и contention,
затем отдельно согласовать Firestore transactions или SQL ledger. Не делать раздельные RTDB locks без recovery protocol.

## Прочая экономика и гонки

- Server catalog определяет цены, коэффициенты, XP, вероятности и pity; операции buy/sell/spin/case/claim
  меняют account+receipt одним transaction. Целочисленные деньги, max bounds и отсутствие отрицательных остатков.
- Case opening сохраняет выигрыш и pending reward одновременно со списанием; закрытие вкладки не теряет предмет.
  RNG вычисляется сервером один раз вне повторяемого callback и сохраняется по requestId.
- `startRace`: выдать server seed, runId, physicsVersion, owned car snapshot и deadline.
- `finishRace`: принять bounded input replay, воспроизвести deterministic fixed-step physics на сервере,
  вычислить дистанцию/peak/XP/cash, атомарно закрыть runId и выдать награду один раз.
- Простые upper bounds времени/скорости полезны, но не делают присланную клиентом сумму проверенной.
  До серверного replay рекорды legacy должны оставаться явно непроверенными.
- Offline режим остаётся локальным sandbox. Сервер не принимает произвольный offline balance;
  способ сохранения существующего legacy прогресса определяется миграцией, а не новым merge из браузера.

## Миграция PIN без удаления прогресса

Текущие короткие PIN и публичные данные уже могли быть скопированы. Нельзя гарантировать владельца
только по старому PIN. Не пересылать полную базу/PIN в чат, Git, отчёты или тестовые fixtures.

1. После отдельного согласования экспортировать production в закрытое зашифрованное хранилище,
   зафиксировать snapshot revision, суммы balance и количества объектов без credentials в отчёте.
2. В staging на синтетических данных проверить nickname normalization/collisions; сохранить старые ключи
   в mapping. UID назначить один раз, уникальные plate/car IDs — один раз; индексы массива не являются ID.
3. Для nickname+PIN login нужен серверный credential broker: server-side scrypt с случайной солью и pepper
   (параметры нагрузочно протестировать). Клиентское хеширование PIN не является защитой авторизации.
   Broker возвращает Firebase custom token, клиент выполняет signInWithCustomToken и больше не читает PIN из RTDB.
4. Migration worker читает legacy PIN только внутри доверенного процесса и преобразует в закрытый verifier.
   Операции restart-safe с контрольной точкой, deterministic UID mapping, staging receipt и counts.
   Не сохранять PIN в промежуточные JSON; не логировать bodies, raw usernames+passwords или токены.
5. Отсутствующий PIN, collisions и подозрительные профили не дают автоматический вход: отдельная проверка
   владельца/восстановление и смена credential. Раскрытый admin credential отозвать независимо от обычных аккаунтов.
6. Для каждого профиля копировать баланс, XP, гараж, номера и рекорды из согласованного server snapshot,
   сверить checksum нормализованных игровых полей, сохранить исходный закрытый архив.
   Не импортировать произвольный браузерный save и не обнулять игроков с необычно большим балансом автоматически.
7. Финальный cutover требует подтверждения: короткое окно остановки legacy записей, final delta export,
   сверка, включение authenticated clients+strict rules как единого изменения. Пока legacy write разрешён,
   пользователи и атакующий могут изменять источник миграции — нельзя объявить v2 защищённым до cutover.
8. После проверенного входа/копирования удалить legacy PIN из активного публичного дерева,
   очистить его из localStorage клиента, сохранить игровой кеш без credential и с uid.
   Удаление и массовое обновление выполняются только после отдельного подтверждения.
9. Выдать пользователям возможность сменить пароль/привязать безопасный recovery provider.
   Ограничения попыток по account+IP, одинаковые ошибки при неизвестном nickname/неверном PIN,
   защищённый recovery для коротких PIN, мониторинг попыток без хранения введённых значений.

## Тесты и выпуск следующего PR

Нужны Auth/RTDB emulator integration tests: анонимное чтение profiles/credentials запрещено,
UID A не читает B и не меняет balance даже свой; неверные/missing/admin-claimed tokens отклоняются;
публичные projections не содержат credentials; два покупателя и buy/cancel, повторы запросов,
несовпадающий payload requestId, недостаточный баланс, offline disconnect и retry;
перезапуск migration worker не создаёт дубликатов, counts/checksums сохраняются; race finish replay один раз.

Этот PR не содержит deploy commands/credentials и не заявляет выполненные emulator tests v2.
Выкатка отдельно: проверенный backup+restore drill, release manifest, health checks и владелец отката.
Откат не должен вновь открывать публичные credentials и запись баланса: предыдущий безопасный backend
или maintenance mode плюс сохранённый ledger, а не возврат к старым публичным правилам.
